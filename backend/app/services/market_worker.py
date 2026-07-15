import asyncio
import logging
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.yahoo_finance import YahooFinanceService
from app.models.models import DailyMarketSnapshot
from app.utils.time_utils import get_current_ist_time, get_market_status

logger = logging.getLogger(__name__)

async def fetch_and_store_market_snapshots():
    """
    Fetches Sensex and Nifty 50 quotes, caches them, and upserts daily_market_snapshot.
    """
    tickers = ["^BSESN", "^NSEI"]
    db: Session = SessionLocal()
    try:
        ist_now = get_current_ist_time()
        today = ist_now.date()
        
        # Only log daily snapshot if it is a trading day (non-weekend/non-holiday)
        # Note: We still fetch the index quote in background for live indicators.
        market_status, _ = get_market_status(db, ist_now)
        
        for ticker in tickers:
            # Force refresh from Yahoo Finance
            quote = YahooFinanceService.get_quote(ticker, force_refresh=True)
            if "error" in quote:
                logger.warning(f"Error fetching background quote for {ticker}: {quote['error']}")
                continue
                
            price = quote.get("regularMarketPrice")
            open_val = quote.get("regularMarketOpen") or price
            high_val = quote.get("regularMarketDayHigh") or price
            low_val = quote.get("regularMarketDayLow") or price
            close_val = price # Latest price acts as close
            volume = quote.get("regularMarketVolume") or 0
            
            if price is None:
                continue

            # Update/Insert into DailyMarketSnapshot if it's a trading day
            if market_status != "CLOSED" or (market_status == "CLOSED" and ist_now.hour >= 15):
                # Check if snapshot already exists for today
                snapshot = db.query(DailyMarketSnapshot).filter(
                    DailyMarketSnapshot.ticker == ticker,
                    DailyMarketSnapshot.date == today
                ).first()
                
                if snapshot:
                    # Update
                    snapshot.close = close_val
                    snapshot.high = max(snapshot.high, high_val)
                    snapshot.low = min(snapshot.low, low_val)
                    snapshot.volume = volume
                else:
                    # Insert
                    snapshot = DailyMarketSnapshot(
                        ticker=ticker,
                        date=today,
                        open=open_val,
                        high=high_val,
                        low=low_val,
                        close=close_val,
                        volume=volume
                    )
                    db.add(snapshot)
                
                db.commit()
                logger.info(f"Updated DailyMarketSnapshot for {ticker} at {ist_now}")
                
    except Exception as e:
        logger.error(f"Error in background market snapshot worker: {e}")
        db.rollback()
    finally:
        db.close()

async def market_worker_loop():
    """
    Background worker loop that runs every 2 minutes.
    """
    logger.info("Starting background market data worker loop...")
    while True:
        try:
            await fetch_and_store_market_snapshots()
        except Exception as e:
            logger.error(f"Error in market worker loop: {e}")
        # Run every 2 minutes
        await asyncio.sleep(120)
