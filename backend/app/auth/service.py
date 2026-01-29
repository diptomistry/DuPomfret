"""Auth helper service: calls Supabase Auth REST API for login and token refresh."""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from app.core.config import settings


def _auth_base_url() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def _apikey() -> str:
    """Use anon key for token endpoint when set; else service role (server-side)."""
    return settings.supabase_anon_key or settings.supabase_service_role_key


async def login_with_password(email: str, password: str) -> Dict[str, Any]:
    """
    Sign in with email/password via Supabase Auth.
    Returns session dict: access_token, refresh_token, expires_in, user, etc.
    """
    url = f"{_auth_base_url()}/token?grant_type=password"
    headers = {
        "apikey": _apikey(),
        "Content-Type": "application/json",
    }
    body = {"email": email, "password": password}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def refresh_token(refresh_token: str) -> Dict[str, Any]:
    """
    Exchange refresh_token for new access_token and refresh_token.
    Returns session dict: access_token, refresh_token, expires_in, user, etc.
    """
    url = f"{_auth_base_url()}/token?grant_type=refresh_token"
    headers = {
        "apikey": _apikey(),
        "Content-Type": "application/json",
    }
    body = {"refresh_token": refresh_token}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json()
