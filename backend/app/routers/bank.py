from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, VirtualWallet, VirtualBankAccount
from app.schemas.schemas import BankAccountCreate, BankAccountResponse, FDSimulationResponse
from app.utils.time_utils import get_current_ist_time

router = APIRouter(prefix="/bank", tags=["bank"])

@router.get("/accounts", response_model=List[BankAccountResponse])
def get_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    accounts = db.query(VirtualBankAccount).filter(VirtualBankAccount.user_id == current_user.id).all()
    return accounts

@router.get("/simulate-fd", response_model=FDSimulationResponse)
def simulate_fixed_deposit(
    amount: float = Query(..., gt=0),
    tenure_months: int = Query(..., ge=1, le=120)
):
    rate = 0.075 # 7.5% annual interest rate
    # Simple interest or compound interest quarterly
    # Standard Indian FD compounding is quarterly: A = P(1 + r/4)^(4n)
    years = tenure_months / 12.0
    maturity_value = amount * ((1 + rate / 4) ** (4 * years))
    
    return FDSimulationResponse(
        amount=amount,
        tenure_months=tenure_months,
        interest_rate=rate,
        maturity_value=round(maturity_value, 2),
        interest_earned=round(maturity_value - amount, 2)
    )

@router.post("/create-account", response_model=BankAccountResponse)
def create_bank_account(
    account_in: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wallet = db.query(VirtualWallet).filter(VirtualWallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Virtual wallet not initialized.")
        
    amount = account_in.amount
    if float(wallet.cash_balance) < amount:
        raise HTTPException(status_code=400, detail="Insufficient cash in wallet to open this account.")
        
    # Deduct wallet cash
    wallet.cash_balance = float(wallet.cash_balance) - amount
    
    rate = 0.04 if account_in.account_type == "SAVINGS" else 0.075
    maturity_date = None
    
    if account_in.account_type == "FD":
        if not account_in.tenure_months:
            raise HTTPException(status_code=400, detail="Tenure in months is required for Fixed Deposits.")
        maturity_date = get_current_ist_time() + timedelta(days=account_in.tenure_months * 30)

    db_account = VirtualBankAccount(
        user_id=current_user.id,
        account_type=account_in.account_type,
        balance=amount,
        interest_rate=rate,
        tenure_months=account_in.tenure_months,
        maturity_date=maturity_date,
        status="ACTIVE"
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return db_account
