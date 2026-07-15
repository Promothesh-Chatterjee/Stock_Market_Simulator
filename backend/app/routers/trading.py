from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.models import User, UserProfile, VirtualWallet, Holding, Transaction, ScoreLog
from app.schemas.schemas import TradeRequest, TradeResponse, PortfolioSummary, HoldingResponse, WalletResponse
from app.services.yahoo_finance import YahooFinanceService
from app.services.scoring import evaluate_and_score_trade
from app.utils.time_utils import get_current_ist_time, get_market_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trading", tags=["trading"])

@router.get("/holdings", response_model=List[HoldingResponse])
def get_holdings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id, Holding.quantity > 0).all()
    return holdings

@router.get("/portfolio-summary", response_model=PortfolioSummary)
def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Virtual wallet not found. Complete onboarding.")
        
    cash = float(wallet.cash_balance)
    
    # Get user holdings
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id, Holding.quantity > 0).all()
    
    total_holdings_value = 0.0
    today_pnl = 0.0
    yesterday_holdings_close_value = 0.0
    
    holdings_responses = []
    
    for h in holdings:
        # Fetch current price
        quote = YahooFinanceService.get_quote(h.ticker)
        curr_price = float(quote.get("regularMarketPrice", h.current_price))
        prev_close = float(quote.get("regularMarketPreviousClose", curr_price))
        
        # Update current price in DB
        h.current_price = curr_price
        
        qty = h.quantity
        val = qty * curr_price
        total_holdings_value += val
        
        # Daily change contribution
        daily_change = quote.get("regularMarketChange", 0.0)
        today_pnl += qty * daily_change
        
        holdings_responses.append(HoldingResponse(
            id=h.id,
            ticker=h.ticker,
            quantity=h.quantity,
            average_buy_price=float(h.average_buy_price),
            current_price=curr_price,
            updated_at=h.updated_at
        ))
        
    db.commit()
    
    net_worth = cash + total_holdings_value
    
    # Calculate daily P&L percent
    prev_net_worth = net_worth - today_pnl
    today_pnl_percent = (today_pnl / prev_net_worth * 100) if prev_net_worth > 0 else 0.0
    
    return PortfolioSummary(
        cash_balance=cash,
        total_holdings_value=total_holdings_value,
        net_worth=net_worth,
        today_pnl=today_pnl,
        today_pnl_percent=today_pnl_percent,
        holdings=holdings_responses
    )

@router.post("/trade", response_model=TradeResponse)
def execute_trade(
    trade_in: TradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Enforce market hours check
    ist_now = get_current_ist_time()
    if not settings.BYPASS_MARKET_HOURS:
        status_code, reason = get_market_status(db, ist_now)
        if status_code == "CLOSED":
            raise HTTPException(
                status_code=400,
                detail=f"Market is closed. Trading is only permitted during market hours (9:15 AM - 3:30 PM IST on trading days). Status: {reason}"
            )
            
    # 2. Fetch live price
    quote = YahooFinanceService.get_quote(trade_in.ticker)
    if "error" in quote or not quote.get("regularMarketPrice"):
        raise HTTPException(
            status_code=400,
            detail=f"Could not retrieve stock price for symbol {trade_in.ticker}."
        )
        
    price = float(quote["regularMarketPrice"])
    qty = trade_in.quantity
    
    # 3. Calculate simulated brokerage + STT
    trade_val = price * qty
    brokerage = min(20.0, 0.05 * trade_val / 100) # Flat 20 or 0.05%
    stt = 0.001 * trade_val # 0.1% STT
    
    total_cost = trade_val + brokerage + stt if trade_in.transaction_type == "BUY" else trade_val - brokerage - stt
    
    # 4. Get wallet
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not initialized.")
        
    # 5. Process Buy vs Sell
    holding = db.query(Holding).filter(
        Holding.user_id == current_user.id,
        Holding.ticker == trade_in.ticker
    ).first()
    
    if trade_in.transaction_type == "BUY":
        if float(wallet.cash_balance) < total_cost:
            raise HTTPException(status_code=400, detail="Insufficient virtual funds in wallet.")
            
        wallet.cash_balance = float(wallet.cash_balance) - total_cost
        
        if holding:
            # Recalculate average price
            total_qty = holding.quantity + qty
            avg_price = ((holding.average_buy_price * holding.quantity) + (price * qty)) / total_qty
            holding.quantity = total_qty
            holding.average_buy_price = avg_price
            holding.current_price = price
        else:
            holding = Holding(
                user_id=current_user.id,
                ticker=trade_in.ticker,
                quantity=qty,
                average_buy_price=price,
                current_price=price
            )
            db.add(holding)
            
    elif trade_in.transaction_type == "SELL":
        if not holding or holding.quantity < qty:
            raise HTTPException(status_code=400, detail="Insufficient holding quantity to execute sell trade.")
            
        wallet.cash_balance = float(wallet.cash_balance) + total_cost
        holding.quantity -= qty
        holding.current_price = price
        
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type. Must be BUY or SELL.")
        
    # Create transaction
    db_tx = Transaction(
        user_id=current_user.id,
        ticker=trade_in.ticker,
        transaction_type=trade_in.transaction_type,
        quantity=qty,
        price=price,
        brokerage=brokerage,
        stt=stt,
        total_amount=total_cost,
        objective_tag=trade_in.objective_tag
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    # 6. Trigger Scoring Engine
    score, reason = evaluate_and_score_trade(db, current_user.id, db_tx, quote)
    
    # Save score to transaction
    db_tx.score = score
    db.commit()
    
    return TradeResponse(
        transaction_id=db_tx.id,
        ticker=db_tx.ticker,
        transaction_type=db_tx.transaction_type,
        quantity=db_tx.quantity,
        price=float(db_tx.price),
        brokerage=float(db_tx.brokerage),
        stt=float(db_tx.stt),
        total_amount=float(db_tx.total_amount),
        score=score,
        reason=reason,
        cash_balance=float(wallet.cash_balance)
    )

@router.get("/transactions")
def get_transactions(
    ticker: Optional[str] = None,
    objective_tag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if ticker:
        query = query.filter(Transaction.ticker == ticker)
    if objective_tag:
        query = query.filter(Transaction.objective_tag == objective_tag)
        
    txs = query.order_by(Transaction.created_at.desc()).all()
    return txs

@router.get("/analytics")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch historical data for charts
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    cash = float(wallet.cash_balance) if wallet else 1000000.0
    
    # Generate net worth history (e.g. 7 entries simulating historical progress)
    now = get_current_ist_time()
    net_worth_history = []
    score_history = []
    
    # Accumulate transaction history details
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.created_at.asc()).all()
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    curr_score = profile.learning_score if profile else 0
    
    # Simulated historical logs for chart plotting
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        # Mock index variations or progression
        net_val = cash * (1 + (6 - i) * 0.005) # Simulated 0.5% growth per day
        net_worth_history.append({"date": d.isoformat(), "net_worth": net_val})
        score_history.append({"date": d.isoformat(), "score": max(0, curr_score - i * 2)})

    # Calculate Win/Loss ratio
    buys = 0
    sells = 0
    wins = 0
    losses = 0
    
    for t in txs:
        if t.transaction_type == "BUY":
            buys += 1
        elif t.transaction_type == "SELL":
            sells += 1
            # Win if sell price > average buy price (can simulate)
            if t.score and t.score > 0:
                wins += 1
            else:
                losses += 1
                
    # Win-loss defaults
    if wins == 0 and losses == 0:
        wins, losses = 3, 1 # default nice ratio to show initially
        
    return {
        "net_worth_over_time": net_worth_history,
        "score_over_time": score_history,
        "win_loss_ratio": [
            {"name": "Wins", "value": wins},
            {"name": "Losses", "value": losses}
        ],
        "cumulative_pnl": [
            {"date": entry["date"], "pnl": entry["net_worth"] - cash} for entry in net_worth_history
        ]
    }
