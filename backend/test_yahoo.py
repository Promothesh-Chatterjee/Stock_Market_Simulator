import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__))))

from app.services.yahoo_finance import YahooFinanceService

if __name__ == "__main__":
    print("Testing YahooFinanceService...")
    res = YahooFinanceService.get_quote("^NSEI", force_refresh=True)
    print("Nifty 50 quote response:")
    print(res)
    
    print("\nTesting historical quote...")
    hist = YahooFinanceService.get_historical("RELIANCE.NS", "2026-07-01", "2026-07-15", "1d", force_refresh=True)
    if "error" in hist:
        print("Error fetching historical:", hist["error"])
    else:
        print("Successfully fetched historical data. Quotes length:", len(hist.get("quotes", [])))
        if len(hist.get("quotes", [])) > 0:
            print("First quote sample:", hist["quotes"][0])
