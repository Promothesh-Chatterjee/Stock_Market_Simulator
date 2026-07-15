from sqlalchemy.orm import Session
from app.models.models import User, UserProfile, Holding, Transaction, ScoreLog
from app.services.yahoo_finance import YahooFinanceService
import logging

logger = logging.getLogger(__name__)

def evaluate_and_score_trade(db: Session, user_id: int, transaction: Transaction, quote: dict) -> tuple[int, str]:
    """
    Evaluates a transaction and returns (score, reason) where score is between -5 and +5.
    Updates the user's profile learning_score.
    """
    score = 0
    reasons = []

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        return 0, "No user profile found"

    # 1. Position Sizing Rule
    trade_value = float(transaction.total_amount)
    wallet = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    # Let's check cash balance before trade
    from app.models.models import VirtualWallet
    user_wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == user_id).first()
    cash = float(user_wallet.cash_balance) if user_wallet else 1000000.0
    
    if trade_value > (cash + trade_value) * 0.5:
        score -= 2
        reasons.append("High concentration: trade value exceeded 50% of cash balance.")
    elif trade_value < (cash + trade_value) * 0.1:
        score += 1
        reasons.append("Prudent sizing: single trade kept below 10% of portfolio value.")

    # 2. Diversification Rule
    holdings_count = db.query(Holding).filter(Holding.user_id == user_id, Holding.quantity > 0).count()
    if holdings_count <= 1 and transaction.transaction_type == "BUY":
        score -= 1
        reasons.append("Low diversification: portfolio concentrated in 1 asset.")
    elif holdings_count >= 4:
        score += 1
        reasons.append("Good diversification: portfolio spread across 4 or more assets.")

    # 3. Trend Alignment (Momentum vs FOMO)
    change_pct = quote.get("regularMarketChangePercent", 0.0)
    if transaction.transaction_type == "BUY":
        if change_pct > 5.0:
            score -= 1
            reasons.append("Potential FOMO: buying stock that surged over 5% today.")
        elif 0.0 < change_pct <= 3.0:
            score += 1
            reasons.append("Trend alignment: buying stock on a mild daily uptrend.")
        elif change_pct < -3.0:
            score += 1
            reasons.append("Value buy: acquiring stock at a discount of over 3% today.")
    elif transaction.transaction_type == "SELL":
        if change_pct < -2.0:
            score += 1
            reasons.append("Cut loss: sold asset during daily downtrend to protect capital.")
        elif change_pct > 3.0:
            score += 1
            reasons.append("Profit taking: sold asset during daily uptrend.")

    # 4. Objective Alignment Rule
    objectives = profile.financial_objectives or []
    ticker = transaction.ticker.upper()
    
    if "Short-Term Trading" in objectives and transaction.transaction_type == "BUY":
        score += 1
        reasons.append("Matches Short-Term Trading objective: active stock trade.")
    elif "Wealth Creation" in objectives and ticker in ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"] and transaction.transaction_type == "BUY":
        score += 1
        reasons.append("Matches Wealth Creation: investing in blue-chip NSE stock.")
        
    # Clip score between -5 and +5
    final_score = max(-5, min(5, score))
    final_reason = " | ".join(reasons) if reasons else "Executed standard trade with moderate parameters."
    
    # Create ScoreLog
    score_log = ScoreLog(
        transaction_id=transaction.id,
        user_id=user_id,
        score=final_score,
        reason=final_reason
    )
    db.add(score_log)
    
    # Update user's profile learning score
    profile.learning_score += final_score
    # Bound learning score to non-negative
    if profile.learning_score < 0:
        profile.learning_score = 0
        
    db.commit()
    
    return final_score, final_reason
