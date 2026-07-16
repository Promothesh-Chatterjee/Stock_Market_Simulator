from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import logging
import re
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.models import User, UserProfile, Transaction, ScoreLog, Holding
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.yahoo_finance import YahooFinanceService
from g4f.client import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/chat", response_model=ChatResponse)
async def chat_helpdesk(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = request.message.lower()
    
    # 1. Fetch user context
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id, Holding.quantity > 0).all()
    last_tx = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc()).first()
    
    holdings_str = ", ".join([f"{h.ticker} ({h.quantity} shares)" for h in holdings]) if holdings else "No stock holdings yet."
    last_trade_str = ""
    if last_tx:
        last_trade_str = f"Last trade: {last_tx.transaction_type} {last_tx.quantity} shares of {last_tx.ticker} at ₹{float(last_tx.price):.2f}. Decision Score: {last_tx.score or 0}/5."
        
    context_prompt = (
        f"You are a helpful Indian financial literacy assistant for FinLit Sim. "
        f"User name: {profile.full_name if profile else 'User'}. "
        f"Stated risk profile: {profile.risk_appetite if profile else 'Moderate'}. "
        f"Current holdings: {holdings_str}. "
        f"{last_trade_str}\n"
        f"Strictly provide answers tailored to Indian SEBI guidelines, NSE/BSE rules, and Indian Income Tax regulations (e.g. LTCG is 12.5% on gains above 1.25 Lakhs, STCG is 20% on short-term equity gains). "
        f"If the user asks about their recent trade or score, analyze the last trade details provided above and explain why they got that score (e.g. position sizing or diversification) in a supportive, educational way."
    )

    # 2. Intercept Tickers in Message for Real Data
    words = re.findall(r'\b[A-Z]{3,15}\b', msg.upper())
    market_context = ""
    for word in words:
        ticker = word if word.endswith(".NS") else f"{word}.NS"
        try:
            quote = YahooFinanceService.get_quote(ticker)
            if "error" not in quote:
                price = quote.get("regularMarketPrice", 0)
                change = quote.get("regularMarketChangePercent", 0)
                market_context += f"Live Market Data for {word}: Price ₹{price:,.2f}, Change {change:+.2f}%. "
        except Exception:
            pass

    # Check common terms for index
    if "NIFTY" in msg.upper():
        quote = YahooFinanceService.get_quote("^NSEI")
        if "error" not in quote:
            market_context += f"Live Market Data for NIFTY 50: Price ₹{quote.get('regularMarketPrice', 0):,.2f}, Change {quote.get('regularMarketChangePercent', 0):+.2f}%. "
    if "SENSEX" in msg.upper():
        quote = YahooFinanceService.get_quote("^BSESN")
        if "error" not in quote:
            market_context += f"Live Market Data for SENSEX: Price ₹{quote.get('regularMarketPrice', 0):,.2f}, Change {quote.get('regularMarketChangePercent', 0):+.2f}%. "

    full_prompt = context_prompt + "\n\n" + (f"Important Live Market Context to use in your answer: {market_context}" if market_context else "")

    # 3. Use g4f for AI Generation
    try:
        client = Client()
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": full_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        response_text = response.choices[0].message.content
        return ChatResponse(response=response_text, sources=["AI Helpdesk"])
    except Exception as e:
        logger.error(f"Error calling g4f: {e}")
        fallback = "Sorry, I am facing some network issues right now. "
        if market_context:
            fallback += f"However, I was able to fetch this data: {market_context}"
        return ChatResponse(response=fallback, sources=["Fallback"])
