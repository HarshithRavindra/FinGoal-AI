"""Authentication and User Profile Router."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.auth import Token, UserCreate, UserResponse
from app.utils.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with encrypted credentials."""
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user,
    }


@router.post("/login", response_model=Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate credentials and grant JWT access token."""
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_authenticated_user(current_user: User = Depends(get_current_user)):
    """Retrieve profile metadata for the authenticated user session."""
    return current_user

