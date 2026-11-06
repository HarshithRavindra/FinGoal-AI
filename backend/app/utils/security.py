"""Cryptographic security, password hashing, and JWT tokens."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import User

# Password hashing with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Bearer token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    """Hash raw password with salted bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency to extract and validate the authenticated User from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user

