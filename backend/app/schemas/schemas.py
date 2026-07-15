from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Profile / Onboarding Schemas
class UserProfileCreate(BaseModel):
    full_name: str
    employment_status: str  # Student, Salaried, Self-Employed, Unemployed
    annual_salary: float = 0.0
    financial_objectives: List[str]
    risk_appetite: str  # Conservative, Moderate, Aggressive
    starting_capital: float = Field(1000000.0, description="Virtual cash budget in INR")

class UserProfileResponse(BaseModel):
    user_id: int
    full_name: str
    employment_status: str
    annual_salary: float
    financial_objectives: List[str]
    risk_appetite: str
    learning_score: int

    class Config:
        from_attributes = True

# Wallet & Holding Schemas
class WalletResponse(BaseModel):
    user_id: int
    cash_balance: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HoldingResponse(BaseModel):
    id: int
    ticker: str
    quantity: int
    average_buy_price: float
    current_price: float
    updated_at: datetime

    class Config:
        from_attributes = True

class PortfolioSummary(BaseModel):
    cash_balance: float
    total_holdings_value: float
    net_worth: float
    today_pnl: float
    today_pnl_percent: float
    holdings: List[HoldingResponse]

# Trading Schemas
class TradeRequest(BaseModel):
    ticker: str
    transaction_type: str  # BUY or SELL
    quantity: int = Field(..., gt=0)
    objective_tag: Optional[str] = None

class TradeResponse(BaseModel):
    transaction_id: int
    ticker: str
    transaction_type: str
    quantity: int
    price: float
    brokerage: float
    stt: float
    total_amount: float
    score: Optional[int] = None
    reason: Optional[str] = None
    cash_balance: float

# Virtual Bank Schemas
class BankAccountCreate(BaseModel):
    account_type: str  # SAVINGS or FD
    amount: float = Field(..., gt=0)
    tenure_months: Optional[int] = None  # Needed for FD

class BankAccountResponse(BaseModel):
    id: int
    user_id: int
    account_type: str
    balance: float
    interest_rate: float
    tenure_months: Optional[int] = None
    maturity_date: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class FDSimulationRequest(BaseModel):
    amount: float = Field(..., gt=0)
    tenure_months: int = Field(..., ge=1, le=120)

class FDSimulationResponse(BaseModel):
    amount: float
    tenure_months: int
    interest_rate: float
    maturity_value: float
    interest_earned: float

# Market Snapshots & News
class StockQuote(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    previous_close: Optional[float] = None
    sparkline: Optional[List[float]] = None

class NewsArticle(BaseModel):
    headline: str
    source: str
    url: str
    published_at: datetime

# Interactive Calendar
class CalendarCheckResponse(BaseModel):
    date: date
    is_trading_day: bool
    status_message: str  # "Market Open" or "Market Closed - Weekend/Holiday Name"
    sensex: Optional[Dict[str, Any]] = None
    nifty: Optional[Dict[str, Any]] = None
    gainers: Optional[List[Dict[str, Any]]] = None
    losers: Optional[List[Dict[str, Any]]] = None
    user_trades: Optional[List[Dict[str, Any]]] = None
    user_pnl_summary: Optional[Dict[str, Any]] = None

# AI Helpdesk
class ChatRequest(BaseModel):
    message: str
    include_history: bool = True

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None
