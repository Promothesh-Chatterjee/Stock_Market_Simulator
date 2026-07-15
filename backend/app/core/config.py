from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinLit Sim Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkeychangeinprod1234567890"  # Fallback secret key
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: Optional[str] = None  # If not set, app will fall back to SQLite locally
    
    # Cache
    REDIS_URL: Optional[str] = None  # If not set, app will use internal python dict cache
    
    # External APIs
    NEWS_API_KEY: Optional[str] = None
    CLAUDE_API_KEY: Optional[str] = None
    
    # Dev settings
    PORT: int = 8000
    BYPASS_MARKET_HOURS: bool = False

    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
