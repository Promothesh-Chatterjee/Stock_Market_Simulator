from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
if not db_url:
    # Use SQLite fallback
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "finlit_sim.db")
    db_url = f"sqlite:///{db_path}"
    logger.warning(f"No DATABASE_URL configured. Falling back to SQLite: {db_url}")

# Setup connection arguments depending on dialect
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(db_url, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.error(f"Failed to connect to database {db_url}. Error: {e}")
    # Fallback to local SQLite if it was configured as postgres but failed
    if not db_url.startswith("sqlite"):
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "finlit_sim.db")
        db_url = f"sqlite:///{db_path}"
        logger.warning(f"PostgreSQL connection failed. Falling back to SQLite: {db_url}")
        engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
