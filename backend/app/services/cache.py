import time
import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback in-memory cache
class InMemoryCache:
    def __init__(self):
        self._store = {}
        self._expiry = {}

    def get(self, key: str) -> Optional[str]:
        now = time.time()
        if key in self._store:
            exp = self._expiry.get(key)
            if exp is None or now < exp:
                return self._store[key]
            else:
                # Expired
                self.delete(key)
        return None

    def set(self, key: str, value: str, expire_seconds: int = None) -> None:
        self._store[key] = value
        if expire_seconds:
            self._expiry[key] = time.time() + expire_seconds
        else:
            self._expiry[key] = None

    def delete(self, key: str) -> None:
        self._store.pop(key, None)
        self._expiry.pop(key, None)

    def flush(self) -> None:
        self._store.clear()
        self._expiry.clear()

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.local_cache = None
        
        if settings.REDIS_URL:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                logger.info("Connected to Redis successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to Redis at {settings.REDIS_URL}. Falling back to in-memory cache. Error: {e}")
                self.redis_client = None
                self.local_cache = InMemoryCache()
        else:
            logger.info("No REDIS_URL configured. Using local in-memory cache.")
            self.local_cache = InMemoryCache()

    def get(self, key: str) -> Optional[str]:
        if self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {e}. Falling back to local cache.")
                # We can dynamically switch to local cache if Redis fails
                if not self.local_cache:
                    self.local_cache = InMemoryCache()
                return self.local_cache.get(key)
        return self.local_cache.get(key)

    def set(self, key: str, value: Any, expire_seconds: int = None) -> None:
        val_str = str(value) if not isinstance(value, (dict, list)) else json.dumps(value)
        if self.redis_client:
            try:
                self.redis_client.set(key, val_str, ex=expire_seconds)
                return
            except Exception as e:
                logger.error(f"Redis set error: {e}. Falling back to local cache.")
                if not self.local_cache:
                    self.local_cache = InMemoryCache()
        
        self.local_cache.set(key, val_str, expire_seconds)

    def delete(self, key: str) -> None:
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return
            except Exception as e:
                logger.error(f"Redis delete error: {e}. Falling back to local cache.")
                if not self.local_cache:
                    self.local_cache = InMemoryCache()
        self.local_cache.delete(key)

cache = CacheService()
