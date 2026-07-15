from sqlalchemy import Column, Integer, String, DateTime, Date, Numeric, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    wallet = relationship("VirtualWallet", back_populates="user", uselist=False)
    bank_accounts = relationship("VirtualBankAccount", back_populates="user")
    holdings = relationship("Holding", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    score_logs = relationship("ScoreLog", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profile"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    full_name = Column(String, nullable=False)
    employment_status = Column(String, nullable=False) # Student, Salaried, Self-Employed, Unemployed
    annual_salary = Column(Numeric, default=0.0)
    financial_objectives = Column(JSON, default=list) # List of objectives
    risk_appetite = Column(String, nullable=False) # Conservative, Moderate, Aggressive
    learning_score = Column(Integer, default=0)

    user = relationship("User", back_populates="profile")


class VirtualWallet(Base):
    __tablename__ = "virtual_wallet"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    cash_balance = Column(Numeric, default=1000000.0) # Default 10 Lakhs (INR)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="wallet")


class VirtualBankAccount(Base):
    __tablename__ = "virtual_bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_type = Column(String, nullable=False) # "SAVINGS" or "FD"
    balance = Column(Numeric, nullable=False, default=0.0)
    interest_rate = Column(Numeric, nullable=False) # e.g. 0.04 or 0.075
    tenure_months = Column(Integer, nullable=True) # Only for FDs
    maturity_date = Column(DateTime, nullable=True) # Only for FDs
    status = Column(String, nullable=False, default="ACTIVE") # ACTIVE, MATURED, CLOSED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="bank_accounts")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False) # e.g. "RELIANCE.NS"
    quantity = Column(Integer, nullable=False, default=0)
    average_buy_price = Column(Numeric, nullable=False, default=0.0)
    current_price = Column(Numeric, nullable=False, default=0.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="holdings")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False) # "BUY" or "SELL"
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric, nullable=False)
    brokerage = Column(Numeric, nullable=False, default=0.0)
    stt = Column(Numeric, nullable=False, default=0.0)
    total_amount = Column(Numeric, nullable=False)
    objective_tag = Column(String, nullable=True)
    score = Column(Integer, nullable=True) # Populated from Scoring Engine (-5 to +5)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
    score_logs = relationship("ScoreLog", back_populates="transaction")


class ScoreLog(Base):
    __tablename__ = "score_log"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="score_logs")
    transaction = relationship("Transaction", back_populates="score_logs")


class DailyMarketSnapshot(Base):
    __tablename__ = "daily_market_snapshot"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Numeric, nullable=False)
    high = Column(Numeric, nullable=False)
    low = Column(Numeric, nullable=False)
    close = Column(Numeric, nullable=False)
    volume = Column(Numeric, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NewsFeedCache(Base):
    __tablename__ = "news_feed_cache"

    id = Column(Integer, primary_key=True, index=True)
    headline = Column(String, nullable=False)
    source = Column(String, nullable=False)
    url = Column(String, nullable=False)
    published_at = Column(DateTime, nullable=False)
    cached_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class HolidayCalendar(Base):
    __tablename__ = "holiday_calendar"

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, unique=True, nullable=False)
    holiday_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
