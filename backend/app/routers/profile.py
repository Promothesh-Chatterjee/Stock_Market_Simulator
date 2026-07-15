from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.models import User, UserProfile, VirtualWallet
from app.schemas.schemas import UserProfileCreate, UserProfileResponse

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding profile not found. Please complete onboarding wizard."
        )
    return profile

@router.post("/onboarding", response_model=UserProfileResponse)
def run_onboarding(
    profile_in: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if profile already exists
    existing_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Onboarding has already been completed for this user."
        )
        
    # 1. Create UserProfile
    db_profile = UserProfile(
        user_id=current_user.id,
        full_name=profile_in.full_name,
        employment_status=profile_in.employment_status,
        annual_salary=profile_in.annual_salary,
        financial_objectives=profile_in.financial_objectives,
        risk_appetite=profile_in.risk_appetite,
        learning_score=0 # Starting score
    )
    db.add(db_profile)
    
    # 2. Create VirtualWallet seeded with chosen virtual capital
    db_wallet = VirtualWallet(
        user_id=current_user.id,
        cash_balance=profile_in.starting_capital
    )
    db.add(db_wallet)
    
    try:
        db.commit()
        db.refresh(db_profile)
        return db_profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create profile: {e}"
        )
