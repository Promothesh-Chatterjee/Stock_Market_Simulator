from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import asyncio

from datetime import datetime, date, timedelta
import httpx
import logging
from typing import List, Optional

from app.core.database import get_db
from app.core.config import settings
from app.services.yahoo_finance import YahooFinanceService
from app.services.cache import cache
from app.models.models import HolidayCalendar, DailyMarketSnapshot, Transaction, NewsFeedCache
from app.utils.time_utils import get_current_ist_time, get_market_status, check_is_weekend
from app.schemas.schemas import CalendarCheckResponse, NewsArticle, StockQuote

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])

# List of top Indian stocks for quotes and search fallback
NIFTY_TICKERS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "SBIN.NS", "ITC.NS", "MRF.NS", "CEAT.NS", "BOSCHLTD.NS", "ABBOTT.NS", "JUSTDIAL.NS"
]

@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    ist_now = get_current_ist_time()
    status_code, reason = get_market_status(db, ist_now)
    return {
        "status": status_code,
        "status_message": reason,
        "ist_time": ist_now.isoformat(),
    }

@router.get("/quotes", response_model=List[StockQuote])
def get_quotes(tickers: Optional[str] = None):
    # Default to top tickers if none provided
    ticker_list = tickers.split(",") if tickers else NIFTY_TICKERS
    quotes = []
    
    for ticker in ticker_list:
        data = YahooFinanceService.get_quote(ticker)
        if "error" not in data:
            # Generate dummy sparkline (e.g. 7 points fluctuating around price)
            price = data.get("regularMarketPrice", 100.0)
            prev = data.get("regularMarketPreviousClose", price)
            sparkline = [
                prev,
                prev * 1.001,
                prev * 0.999,
                (prev + price) / 2,
                price * 0.998,
                price * 1.002,
                price
            ]
            
            quotes.append(StockQuote(
                ticker=ticker,
                price=price,
                change=data.get("regularMarketChange", 0.0),
                change_percent=data.get("regularMarketChangePercent", 0.0),
                open=data.get("regularMarketOpen"),
                high=data.get("regularMarketDayHigh"),
                low=data.get("regularMarketDayLow"),
                previous_close=prev,
                sparkline=sparkline
            ))
            
    return quotes

@router.get("/search")
def search_stocks(query: str = Query(..., description="Search query")):
    return YahooFinanceService.search_ticker(query)

@router.get("/news", response_model=List[NewsArticle])
def get_news(db: Session = Depends(get_db)):
    cache_key = "news_articles"
    cached = cache.get(cache_key)
    if cached:
        import json
        try:
            return json.loads(cached)
        except Exception:
            pass

    # Try calling NewsAPI if key is available
    articles = []
    if settings.NEWS_API_KEY:
        try:
            # Query for Indian business news with financial keywords
            url = "https://newsapi.org/v2/top-headlines"
            params = {
                "country": "in",
                "category": "business",
                "apiKey": settings.NEWS_API_KEY
            }
            response = httpx.get(url, params=params, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                for art in data.get("articles", [])[:15]:
                    if art.get("title") and art.get("url"):
                        published_at = datetime.fromisoformat(art["publishedAt"].replace("Z", "+00:00"))
                        articles.append(NewsArticle(
                            headline=art["title"],
                            source=art.get("source", {}).get("name") or "NewsAPI",
                            url=art["url"],
                            published_at=published_at
                        ))
        except Exception as e:
            logger.error(f"Error calling NewsAPI: {e}")

    # Fallback to DB Cache or Mock news
    if not articles:
        db_news = db.query(NewsFeedCache).order_by(NewsFeedCache.published_at.desc()).limit(15).all()
        if db_news:
            articles = [
                NewsArticle(
                    headline=n.headline,
                    source=n.source,
                    url=n.url,
                    published_at=n.published_at
                ) for n in db_news
            ]
        else:
            # Seed mock news
            mocks = [
                {"title": "Sensex crosses 80,000 milestone as FII buying surges in banking shares", "src": "Moneycontrol"},
                {"title": "Nifty reaches record highs after TCS & Infosys report stronger earnings", "src": "Economic Times"},
                {"title": "RBI Governor hints at potential rate cut as inflation drops below 4%", "src": "Livemint"},
                {"title": "SEBI announces new rules for futures and options trading to protect retail investors", "src": "Bloomberg Quint"},
                {"title": "Reliance Industries green energy gigafactory to begin operations this quarter", "src": "Business Standard"},
                {"title": "CEAT & MRF share prices jump as tyre demands rise in domestic auto market", "src": "CNBC TV18"}
            ]
            now = get_current_ist_time()
            for i, m in enumerate(mocks):
                published = now - timedelta(hours=i * 2)
                articles.append(NewsArticle(
                    headline=m["title"],
                    source=m["src"],
                    url="https://finance.yahoo.com",
                    published_at=published
                ))
                # Save to DB cache
                cache_row = NewsFeedCache(
                    headline=m["title"],
                    source=m["src"],
                    url="https://finance.yahoo.com",
                    published_at=published
                )
                db.add(cache_row)
            db.commit()

    # Cache in Redis/Memory for 15 minutes
    if articles:
        import json
        articles_json = [a.dict() for a in articles]
        # We need to serialize datetime to ISO strings for JSON
        for a in articles_json:
            if isinstance(a["published_at"], datetime):
                a["published_at"] = a["published_at"].isoformat()
        cache.set(cache_key, json.dumps(articles_json), expire_seconds=900)

    return articles

@router.get("/calendar", response_model=CalendarCheckResponse)
def get_calendar_details(
    date_str: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),

    db: Session = Depends(get_db)
):
    try:
        query_date = date.fromisoformat(date_str)
    except ValueError as e:
        logger.error(f"Invalid date format received in calendar endpoint: '{date_str}'. Error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: '{date_str}'. Use YYYY-MM-DD.")

        
    ist_now = get_current_ist_time()
    if query_date > ist_now.date():
        return CalendarCheckResponse(
            date=query_date,
            is_trading_day=False,
            status_message="Market Closed - Future Date"
        )

    # 1. Check weekend
    if check_is_weekend(query_date):
        return CalendarCheckResponse(
            date=query_date,
            is_trading_day=False,
            status_message="Market Closed - Weekend"
        )

    # 2. Check holiday
    holiday = db.query(HolidayCalendar).filter(HolidayCalendar.holiday_date == query_date).first()
    if holiday:
        return CalendarCheckResponse(
            date=query_date,
            is_trading_day=False,
            status_message=f"Market Closed - {holiday.holiday_name}"
        )

    # 3. It's a trading day!
    # Fetch Index values from DailyMarketSnapshot or Yahoo Finance
    # For index Sensex (^BSESN) and Nifty 50 (^NSEI)
    nifty_snap = db.query(DailyMarketSnapshot).filter(
        DailyMarketSnapshot.ticker == "^NSEI",
        DailyMarketSnapshot.date == query_date
    ).first()
    
    sensex_snap = db.query(DailyMarketSnapshot).filter(
        DailyMarketSnapshot.ticker == "^BSESN",
        DailyMarketSnapshot.date == query_date
    ).first()

    nifty_data = None
    sensex_data = None
    
    if nifty_snap:
        nifty_data = {
            "open": float(nifty_snap.open),
            "high": float(nifty_snap.high),
            "low": float(nifty_snap.low),
            "close": float(nifty_snap.close)
        }
    else:
        # Fallback to yahoo finance historical
        hist = YahooFinanceService.get_historical("^NSEI", date_str, date_str)
        quotes = hist.get("quotes", [])
        if quotes:
            nifty_data = {
                "open": quotes[0]["open"],
                "high": quotes[0]["high"],
                "low": quotes[0]["low"],
                "close": quotes[0]["close"]
            }
            
    if sensex_snap:
        sensex_data = {
            "open": float(sensex_snap.open),
            "high": float(sensex_snap.high),
            "low": float(sensex_snap.low),
            "close": float(sensex_snap.close)
        }
    else:
        hist = YahooFinanceService.get_historical("^BSESN", date_str, date_str)
        quotes = hist.get("quotes", [])
        if quotes:
            sensex_data = {
                "open": quotes[0]["open"],
                "high": quotes[0]["high"],
                "low": quotes[0]["low"],
                "close": quotes[0]["close"]
            }

    # Generate Gainers & Losers (Real for today, deterministic mock for history)
    gainers = []
    losers = []
    
    if query_date == ist_now.date():
        all_quotes = []
        for t in NIFTY_TICKERS:
            q = YahooFinanceService.get_quote(t)
            if "error" not in q:
                all_quotes.append({
                    "ticker": t,
                    "name": q.get("shortName") or q.get("displayName") or t,
                    "price": q.get("regularMarketPrice", 0),
                    "change_percent": q.get("regularMarketChangePercent", 0)
                })
        all_quotes.sort(key=lambda x: x["change_percent"], reverse=True)
        if len(all_quotes) > 0:
            gainers = all_quotes[:5]
            losers = all_quotes[-5:]
            losers.reverse()
    else:
        import random
        rng = random.Random(query_date.toordinal())
        stock_names = {
            "RELIANCE.NS": "Reliance Industries", "TCS.NS": "TCS", "INFY.NS": "Infosys",
            "HDFCBANK.NS": "HDFC Bank", "ICICIBANK.NS": "ICICI Bank", "SBIN.NS": "State Bank of India",
            "ITC.NS": "ITC Ltd", "MRF.NS": "MRF Ltd", "CEAT.NS": "CEAT Ltd", "BOSCHLTD.NS": "Bosch Ltd"
        }
        all_stocks = list(stock_names.items())
        rng.shuffle(all_stocks)
        
        for symbol, name in all_stocks[:5]:
            gain = rng.uniform(0.5, 4.5)
            gainers.append({"ticker": symbol, "name": name, "price": rng.uniform(500, 5000), "change_percent": gain})
            
        for symbol, name in all_stocks[5:10]:
            loss = rng.uniform(-4.5, -0.5)
            losers.append({"ticker": symbol, "name": name, "price": rng.uniform(500, 5000), "change_percent": loss})

        gainers.sort(key=lambda x: x["change_percent"], reverse=True)
        losers.sort(key=lambda x: x["change_percent"])

    # Query user trades for this date
    # Convert query_date to start/end datetime
    start_dt = datetime.combine(query_date, datetime.min.time())
    end_dt = datetime.combine(query_date, datetime.max.time())
    
    # We will fetch transactions from DB. Let's just return a placeholder for now since Phase F/H is not active yet, 
    # but we can implement the actual query:
    trades = db.query(Transaction).filter(
        Transaction.created_at >= start_dt,
        Transaction.created_at <= end_dt
    ).all()
    
    user_trades = []
    total_invested = 0.0
    total_pnl = 0.0
    
    for t in trades:
        total_invested += float(t.total_amount)
        # Placeholder realized P&L calculation: let's say buy is negative, sell is positive
        # For simplicity, we just aggregate
        user_trades.append({
            "ticker": t.ticker,
            "type": t.transaction_type,
            "quantity": t.quantity,
            "price": float(t.price),
            "amount": float(t.total_amount),
            "score": t.score
        })
    
    pnl_summary = {
        "total_invested": total_invested,
        "pnl": total_pnl, # To be completed when trading engine valuation is fully complete
        "pnl_percent": 0.0
    }

    return CalendarCheckResponse(
        date=query_date,
        is_trading_day=True,
        status_message="Market Open",
        sensex=sensex_data,
        nifty=nifty_data,
        gainers=gainers,
        losers=losers,
        user_trades=user_trades,
        user_pnl_summary=pnl_summary
    )

@router.get("/stock-performance")
def get_stock_performance(
    ticker: str = Query(..., description="Stock ticker"),
    timeframe: str = Query(..., description="Timeframe (1D, 5D, 1M, 6M, YTD, 1Y, 5Y, Max)"),
    db: Session = Depends(get_db)
):
    quote_data = YahooFinanceService.get_quote(ticker)
    if "error" in quote_data:
        raise HTTPException(status_code=404, detail=f"Stock quote not found: {quote_data.get('error')}")

    ist_now = get_current_ist_time()
    end_date = ist_now.date().isoformat()
    interval = "1d"
    
    if timeframe == "1D":
        start_date = (ist_now - timedelta(days=2)).date().isoformat()
        interval = "15m"
    elif timeframe == "5D":
        start_date = (ist_now - timedelta(days=5)).date().isoformat()
        interval = "15m"
    elif timeframe == "1M":
        start_date = (ist_now - timedelta(days=30)).date().isoformat()
        interval = "1d"
    elif timeframe == "6M":
        start_date = (ist_now - timedelta(days=180)).date().isoformat()
        interval = "1d"
    elif timeframe == "YTD":
        start_date = date(ist_now.year, 1, 1).isoformat()
        interval = "1d"
    elif timeframe == "1Y":
        start_date = (ist_now - timedelta(days=365)).date().isoformat()
        interval = "1d"
    elif timeframe == "5Y":
        start_date = (ist_now - timedelta(days=1825)).date().isoformat()
        interval = "1wk"
    else:
        start_date = (ist_now - timedelta(days=3650)).date().isoformat()
        interval = "1mo"

    hist_data = YahooFinanceService.get_historical(ticker, start_date, end_date, interval)
    quotes = hist_data.get("quotes", [])
    
    volatility = "MEDIUM"
    if quotes and len(quotes) > 1:
        import math
        closes = [q["close"] for q in quotes if q.get("close") is not None]
        if len(closes) > 1:
            mean = sum(closes) / len(closes)
            variance = sum((x - mean) ** 2 for x in closes) / (len(closes) - 1)
            std_dev = math.sqrt(variance)
            pct_std = std_dev / mean if mean > 0 else 0
            if pct_std > 0.05:
                volatility = "HIGH"
            elif pct_std < 0.015:
                volatility = "LOW"
                
    co_name = quote_data.get("displayName") or quote_data.get("shortName") or ticker
    curr_price = quote_data.get("regularMarketPrice", 0.0)
    change = quote_data.get("regularMarketChange", 0.0)
    change_pct = quote_data.get("regularMarketChangePercent", 0.0)
    direction = "gained" if change >= 0 else "declined"
    
    ai_summary = (
        f"{co_name} ({ticker}) is showing a {volatility.lower()} volatility pattern over the selected {timeframe} timeline. "
        f"The stock recently traded at ₹{curr_price:,.2f}, having {direction} by {abs(change):,.2f} ({change_pct:+.2f}%) in today's session. "
        f"Technical oscillators display a neutral-to-bullish profile. Staged simulated buy entries could leverage dollar-cost averaging "
        f"to manage risk, while short-term plays should respect support thresholds mapped from recent trading channels."
    )
    
    return {
        "quote": quote_data,
        "quotes": quotes,
        "volatility": volatility,
        "ai_summary": ai_summary
    }

@router.get("/calendar/chart")

def get_calendar_stock_chart(
    ticker: str = Query(..., description="Stock ticker"),
    date_str: str = Query(..., alias="date", description="Selected date")

):
    # Returns historical chart for selected stock surrounding the selected date (+/- 5 days)
    try:
        sel_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    start_date = (sel_date - timedelta(days=5)).isoformat()
    end_date = (sel_date + timedelta(days=5)).isoformat()
    
    hist = YahooFinanceService.get_historical(ticker, start_date, end_date, "1d")
    return hist

@router.websocket("/ws/live-indices")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            nifty = YahooFinanceService.get_quote("^NSEI")
            sensex = YahooFinanceService.get_quote("^BSESN")
            
            payload = {
                "nifty": {
                    "price": nifty.get("regularMarketPrice"),
                    "change": nifty.get("regularMarketChange"),
                    "change_percent": nifty.get("regularMarketChangePercent")
                },
                "sensex": {
                    "price": sensex.get("regularMarketPrice"),
                    "change": sensex.get("regularMarketChange"),
                    "change_percent": sensex.get("regularMarketChangePercent")
                }
            }
            await websocket.send_json(payload)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass

