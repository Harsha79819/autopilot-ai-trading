"""Authentication API Router."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, Token
from backend.app.auth.security import verify_password, get_password_hash, create_access_token
from backend.app.auth.dependencies import get_current_user
from backend.app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_active=True
    )
    db.add(user)
    db.flush()

    # Automatically initialize virtual portfolio with exactly INR 100.00
    portfolio = Portfolio(
        user_id=user.id,
        initial_cash=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        cash_balance=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        realized_pnl=0.0,
        total_fees_paid=0.0,
        peak_portfolio_value=settings.INITIAL_VIRTUAL_CAPITAL_INR,
        is_kill_switched=False
    )
    db.add(portfolio)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    access_token = create_access_token(user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
