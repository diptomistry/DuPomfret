"""Auth helper API router: login, token refresh, me (no auth required for login/refresh)."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user
from app.auth.service import login_with_password, refresh_token


router = APIRouter(prefix="/auth", tags=["auth"])


# ----------------------
# Login (no auth)
# ----------------------


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Sign in with email and password.
    Returns access_token (use as Bearer for other APIs) and refresh_token.
    """
    try:
        data = await login_with_password(request.email, request.password)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service error",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    return LoginResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_in=data.get("expires_in", 3600),
        token_type=data.get("token_type", "bearer"),
        user=data.get("user", {}),
    )


# ----------------------
# Refresh token (no auth)
# ----------------------


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token from login")


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: dict


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: RefreshRequest):
    """
    Exchange a refresh_token for a new access_token and refresh_token.
    """
    try:
        data = await refresh_token(request.refresh_token)
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (400, 401):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service error",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    return RefreshResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_in=data.get("expires_in", 3600),
        token_type=data.get("token_type", "bearer"),
        user=data.get("user", {}),
    )


# ----------------------
# Me (requires Bearer token)
# ----------------------


class MeResponse(BaseModel):
    user_id: str
    email: str | None
    role: str = "student"


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    """
    Return the current user from the Bearer token.
    Use this to verify a token or get user_id/email/role.
    """
    return MeResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        role=current_user.role,
    )
