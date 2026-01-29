"""Authentication utilities for Supabase JWT validation.

Supports:
- HS256 tokens signed with `SUPABASE_JWT_SECRET`
- Asymmetric tokens (e.g. ES256) verified via Supabase JWKS:
  `https://<project>.supabase.co/auth/v1/jwks`

Role is read from public.users (source of truth). Fallback: JWT app_metadata.role
or user_metadata.role, then "student".
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional, Tuple

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt

from app.core.config import settings
from app.core.supabase import supabase


security = HTTPBearer()

_JWKS_CACHE: Dict[str, Any] = {
    "fetched_at": 0.0,
    "keys_by_kid": {},  # kid -> jwk dict
}

# Hackathon-friendly cache TTL; keeps startup fast and avoids refetching per request.
_JWKS_TTL_SECONDS = 60 * 60  # 1 hour


class User:
    """User information extracted from JWT."""
    def __init__(
        self,
        user_id: str,
        email: Optional[str] = None,
        role: str = "student",
    ):
        self.user_id = user_id
        self.email = email
        self.role = role.lower() if role else "student"


def _supabase_jwks_url() -> str:
    base = settings.supabase_url.rstrip("/")
    # Supabase (GoTrue) JWKS is typically exposed here:
    # https://<project>.supabase.co/auth/v1/.well-known/jwks.json
    return f"{base}/auth/v1/.well-known/jwks.json"


async def _get_jwks_keys_by_kid() -> Dict[str, Dict[str, Any]]:
    now = time.time()
    if _JWKS_CACHE["keys_by_kid"] and (now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS):
        return _JWKS_CACHE["keys_by_kid"]

    jwks = None
    urls_to_try = [
        _supabase_jwks_url(),
        # Back-compat / older docs (some setups):
        f"{settings.supabase_url.rstrip('/')}/auth/v1/jwks",
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        last_err: Optional[Exception] = None
        for url in urls_to_try:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                jwks = resp.json()
                break
            except Exception as e:
                last_err = e
                continue

    if jwks is None:
        # Convert to JWTError so the caller returns 401 instead of 500.
        raise JWTError(f"Failed to fetch Supabase JWKS (last error: {last_err})")

    keys = jwks.get("keys") or []
    keys_by_kid = {}
    for k in keys:
        kid = k.get("kid")
        if kid:
            keys_by_kid[kid] = k

    _JWKS_CACHE["keys_by_kid"] = keys_by_kid
    _JWKS_CACHE["fetched_at"] = now
    return keys_by_kid


async def _decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """Decode and verify a Supabase JWT (HS256 or JWKS-backed)."""
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "").upper()

    # 1) HS256 (shared secret)
    if alg == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

    # 2) Asymmetric algorithms (ES256, RS256, etc.) via JWKS
    kid = header.get("kid")
    if not kid:
        raise JWTError("Missing kid in token header")

    keys_by_kid = await _get_jwks_keys_by_kid()
    jwk_dict = keys_by_kid.get(kid)
    if not jwk_dict:
        # refresh once in case keys rotated
        _JWKS_CACHE["fetched_at"] = 0.0
        keys_by_kid = await _get_jwks_keys_by_kid()
        jwk_dict = keys_by_kid.get(kid)
        if not jwk_dict:
            raise JWTError("Unknown kid (no matching JWKS key)")

    # Convert JWK to PEM and verify.
    key_obj = jwk.construct(jwk_dict)
    pem = key_obj.to_pem()

    return jwt.decode(
        token,
        pem,
        algorithms=[alg],
        options={"verify_aud": False},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Validate JWT token from Authorization header and extract user info.
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        
    Returns:
        User object with user_id and email
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials

    try:
        payload = await _decode_supabase_jwt(token)

        # Extract user_id (sub claim), email.
        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user_id"
            )

        # Role: source of truth is public.users; fallback to JWT app_metadata/user_metadata, then "student".
        role = await asyncio.to_thread(_get_role_from_public_users_sync, user_id)
        if role is None:
            app_meta = payload.get("app_metadata") or {}
            user_meta = payload.get("user_metadata") or {}
            role = (
                app_meta.get("role")
                or user_meta.get("role")
                or "student"
            )
        if isinstance(role, str):
            role = role.lower()
        else:
            role = "student"
        if role not in ("admin", "student"):
            role = "student"

        return User(user_id=user_id, email=email, role=role)

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


def _get_role_from_public_users_sync(user_id: str) -> Optional[str]:
    """Read role from public.users (sync). Returns None if row missing or error."""
    try:
        resp = (
            supabase.table("users")
            .select("role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if resp.data and len(resp.data) > 0:
            role = (resp.data[0] or {}).get("role")
            if isinstance(role, str) and role.strip():
                return role.lower().strip()
    except Exception:
        pass
    return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to have the admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
