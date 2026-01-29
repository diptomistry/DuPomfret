"""Admin user operations via Supabase Auth REST API (service role) and public.users."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.supabase import supabase


def _auth_base_url() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def _service_role_headers() -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


async def list_users_admin(
    page: int = 1,
    per_page: int = 50,
) -> Dict[str, Any]:
    """
    List users via GoTrue admin API.
    Returns dict with 'users' list and optional 'total'.
    """
    url = f"{_auth_base_url()}/admin/users"
    params = {"page": page, "per_page": per_page}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=_service_role_headers())
        resp.raise_for_status()
        return resp.json()


def _upsert_user_role_sync(user_id: str, role: str) -> None:
    """Write role to public.users (upsert). Sync call."""
    supabase.table("users").upsert(
        {"id": user_id, "role": role},
        on_conflict="id",
    ).execute()


async def update_user_role_admin(user_id: str, role: str) -> None:
    """
    Update role in both:
    1. GoTrue app_metadata (so JWT can carry it after refresh).
    2. public.users (source of truth for backend and RLS).
    """
    url = f"{_auth_base_url()}/admin/users/{user_id}"
    body = {"app_metadata": {"role": role}}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.put(url, json=body, headers=_service_role_headers())
        resp.raise_for_status()
    # Sync to public.users (source of truth for get_current_user and RLS).
    await asyncio.to_thread(_upsert_user_role_sync, user_id, role)
