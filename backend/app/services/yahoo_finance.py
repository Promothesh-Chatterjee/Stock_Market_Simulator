import subprocess
import os
import json
import logging
from typing import Optional, Any, Dict, List
from app.services.cache import cache

logger = logging.getLogger(__name__)

# Base path for backend folder where fetch_market.js is located
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class YahooFinanceService:
    @staticmethod
    def _run_node_script(args: List[str]) -> Dict[str, Any]:
        """
        Executes fetch_market.js via Node subprocess.
        """
        script_path = os.path.join(BACKEND_DIR, "fetch_market.js")
        cmd = ["node", script_path] + args
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=BACKEND_DIR,
                check=False
            )
            if result.returncode != 0:
                logger.error(f"Node script failed with exit code {result.returncode}. Stderr: {result.stderr}")
                # Return error dict
                return {"error": result.stderr or f"Exit code {result.returncode}"}
            
            output = result.stdout.strip()
            if not output:
                return {"error": "Empty response from node script"}
                
            # Filter lines to locate valid JSON block
            json_line = None
            for line in output.splitlines():
                line_str = line.strip()
                if (line_str.startswith("{") and line_str.endswith("}")) or (line_str.startswith("[") and line_str.endswith("]")):
                    json_line = line_str
                    break
            
            if not json_line:
                # If we couldn't parse, see if there's error in stderr or return raw
                return {"error": f"No valid JSON found in output: {output}"}
                
            return json.loads(json_line)
        except Exception as e:
            logger.error(f"Failed to execute node script: {e}")
            return {"error": str(e)}

    @classmethod
    def get_quote(cls, ticker: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retrieves real-time stock quote with cache.
        """
        cache_key = f"quote:{ticker}"
        if not force_refresh:
            cached_val = cache.get(cache_key)
            if cached_val:
                try:
                    return json.loads(cached_val)
                except Exception:
                    pass

        # Fetch from Yahoo Finance
        logger.info(f"Fetching live quote for {ticker} from Yahoo Finance...")
        data = cls._run_node_script(["quote", ticker])
        
        if "error" not in data:
            # Cache the result for 60 seconds (1 minute) to avoid hitting limits
            cache.set(cache_key, data, expire_seconds=60)
        else:
            logger.warning(f"Failed to fetch live quote for {ticker}: {data.get('error')}")
            # Try to return cached data even if expired (stale-while-revalidate style) if it exists in local store
            # but here we just return the error or fallback
            
        return data

    @classmethod
    def get_historical(cls, ticker: str, from_date: str, to_date: str, interval: str = "1d", force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retrieves historical chart data with cache.
        """
        cache_key = f"historical:{ticker}:{from_date}:{to_date}:{interval}"
        if not force_refresh:
            cached_val = cache.get(cache_key)
            if cached_val:
                try:
                    return json.loads(cached_val)
                except Exception:
                    pass

        logger.info(f"Fetching historical chart for {ticker} ({from_date} to {to_date}, interval={interval})...")
        data = cls._run_node_script(["historical", ticker, from_date, to_date, interval])
        
        if "error" not in data:
            # Cache historical data for 1 hour (or 24 hours if older period)
            cache.set(cache_key, data, expire_seconds=3600)
            
        return data
        
    @classmethod
    def search_ticker(cls, query: str) -> List[Dict[str, Any]]:
        """
        Search tickers matching query.
        """
        cache_key = f"search:{query}"
        cached_val = cache.get(cache_key)
        if cached_val:
            try:
                return json.loads(cached_val)
            except Exception:
                pass

        logger.info(f"Searching tickers for query: {query}")
        data = cls._run_node_script(["search", query])
        
        results = []
        if isinstance(data, dict) and "quotes" in data:
            results = data["quotes"]
            # Cache for 24 hours
            cache.set(cache_key, results, expire_seconds=86400)
            
        return results
