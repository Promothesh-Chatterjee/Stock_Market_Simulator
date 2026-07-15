from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import logging
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.models import User, UserProfile, Transaction, ScoreLog, Holding
from app.schemas.schemas import ChatRequest, ChatResponse

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

    # 2. Try calling Claude API if key is available
    if settings.CLAUDE_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "x-api-key": settings.CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                payload = {
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 500,
                    "system": context_prompt,
                    "messages": [{"role": "user", "content": request.message}]
                }
                r = await client.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=10.0)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json["content"][0]["text"]
                    return ChatResponse(response=response_text, sources=["Claude AI"])
                else:
                    logger.error(f"Claude API failed with status {r.status_code}: {r.text}")
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")

    # 3. Smart Contextual Fallback Mock Bot
    fallback_response = ""
    
    if "tax" in msg or "ltcg" in msg or "stcg" in msg or "capital gain" in msg:
        fallback_response = (
            "Under Indian tax laws, capital gains on equity shares listed on NSE/BSE are taxed as follows:\n\n"
            "1. **Short-Term Capital Gains (STCG)**: If you sell your holdings within 12 months of purchase, "
            "gains are taxed at **20%**.\n"
            "2. **Long-Term Capital Gains (LTCG)**: If you hold shares for more than 12 months before selling, "
            "gains exceeding **₹1.25 Lakh** in a financial year are taxed at **12.5%** (gains below ₹1.25 Lakh are exempt).\n\n"
            "Note: These rates apply to equity shares subject to Securities Transaction Tax (STT)."
        )
    elif "last trade" in msg or "my trade" in msg or "my last score" in msg or "explain my score" in msg:
        if last_tx:
            score_log = db.query(ScoreLog).filter(ScoreLog.transaction_id == last_tx.id).first()
            reason_str = score_log.reason if score_log else "Standard parameters matched."
            fallback_response = (
                f"Your last trade was a **{last_tx.transaction_type}** of **{last_tx.quantity} shares of {last_tx.ticker}** "
                f"at **₹{float(last_tx.price):,.2f}**, which received a learning score of **{last_tx.score:+}**.\n\n"
                f"**Evaluation Analysis**:\n{reason_str}\n\n"
                "To optimize future trade scores:\n"
                "- Keep single trade values below 10% of cash balance for prudent risk management.\n"
                "- Diversify across at least 4 different companies to lower portfolio concentration risk."
            )
        else:
            fallback_response = "You haven't executed any simulated trades yet! Go to the Market Analyzer or Dashboard to place your first trade."
    elif "nifty" in msg or "sensex" in msg or "index" in msg:
        fallback_response = (
            "The **Nifty 50** represents the weighted average of the 50 largest Indian companies listed on the National Stock Exchange (NSE). "
            "The **BSE Sensex** tracks 30 prominent stocks listed on the Bombay Stock Exchange (BSE).\n\n"
            "These indices act as benchmarks showing the overall health of the Indian economy and financial markets."
        )
    elif "diversif" in msg:
        fallback_response = (
            "**Diversification** is a key risk management strategy. It involves spreading your capital across various sectors "
            "(e.g., IT, Banking, Energy, FMCG) and stocks rather than concentration in a single stock. "
            "Our trade scoring engine awards **+1 or +2 points** for holding 4 or more unique tickers, helping you learn to manage risk."
        )
    else:
        fallback_response = (
            f"Hello {profile.full_name if profile else 'Investor'}! Based on your stated goals "
            f"({', '.join(profile.financial_objectives) if profile else 'Wealth Creation'}), here are some tips:\n\n"
            "- Check the **News Ticker** on the dashboard to stay updated on Indian market sentiment.\n"
            "- Use the **Virtual Bank** to lock in 7.5% annual interest for secure capital growth.\n"
            "- Search stock symbols (like INFY.NS or HDFCBANK.NS) to analyze historical volatility before buying."
        )
        
    return ChatResponse(response=fallback_response, sources=["FinLit simulator local glossary"])
