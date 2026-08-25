from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageResponse, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=Token,
    summary="User Login (JWT Token)",
    responses={
        200: {"description": "Authentication successful, returns JWT access token."},
        401: {"description": "Incorrect username or password."},
    },
)
def login(login_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Autentikasi user (username & password) dan menghasilkan JWT Access Token.
    """
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current Authenticated User",
    responses={
        200: {"description": "Current user profile."},
        401: {"description": "Not authenticated or invalid token."},
    },
)
def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Mengambil data profil user yang sedang login dari JWT token.
    """
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="User Logout",
)
def logout():
    """
    Endpoint konfirmasi logout.
    Client/Frontend bertanggung jawab menghapus token dari storage lokal.
    """
    return MessageResponse(message="Successfully logged out")
