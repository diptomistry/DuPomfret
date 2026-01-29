"""Admin-only user management: list users, update role."""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.admin.service import list_users_admin, update_user_role_admin
from app.core.auth import User, require_admin
from app.core.supabase import supabase


router = APIRouter(prefix="/admin/users", tags=["admin-users"])


# ---------------------------------------------------------------------------
# List users
# ---------------------------------------------------------------------------


class UserListItem(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "student"


class ListUsersResponse(BaseModel):
    users: List[UserListItem]
    total: Optional[int] = None


@router.get("", response_model=ListUsersResponse)
async def list_users(
    current_user: User = Depends(require_admin),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    List all users (admin only). Returns id, email, and role (from public.users, ground truth).
    Falls back to app_metadata if not found in database.
    """
    _ = current_user
    try:
        data = await list_users_admin(page=page, per_page=per_page)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to list users: {str(e)}",
        )
    raw_users = data.get("users", [])
    total = data.get("total")
    users: List[UserListItem] = []
    
    # Fetch all roles from public.users (ground truth) in one query
    user_ids = [str(u.get("id")) for u in raw_users if u.get("id")]
    roles_from_db: dict[str, str] = {}
    if user_ids:
        try:
            response = supabase.table("users").select("id, role").in_("id", user_ids).execute()
            for row in (response.data or []):
                if row.get("id") and row.get("role"):
                    roles_from_db[str(row["id"])] = str(row["role"]).lower()
        except Exception:
            # If query fails, fall back to metadata
            pass
    
    for u in raw_users:
        uid = u.get("id")
        if not uid:
            continue
        uid_str = str(uid)
        
        # 1. Try to get role from public.users (ground truth)
        role = roles_from_db.get(uid_str)
        
        # 2. Fallback to app_metadata or user_metadata if not in database
        if not role:
            app_meta = u.get("app_metadata") or {}
            user_meta = u.get("user_metadata") or {}
            role = (app_meta.get("role") or user_meta.get("role") or "student")
            if isinstance(role, str):
                role = role.lower()
        
        # 3. Validate and default to student
        if role not in ("admin", "student"):
            role = "student"
        
        users.append(
            UserListItem(
                id=uid_str,
                email=u.get("email"),
                role=role,
            )
        )
    return ListUsersResponse(users=users, total=total)


# ---------------------------------------------------------------------------
# Update user role
# ---------------------------------------------------------------------------


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., description="New role: 'admin' or 'student'")


class UpdateRoleResponse(BaseModel):
    id: str
    role: str


@router.patch("/{user_id}/role", response_model=UpdateRoleResponse)
async def update_user_role(
    user_id: str = Path(..., description="User UUID (auth.users.id)"),
    request: UpdateRoleRequest = ...,
    current_user: User = Depends(require_admin),
):
    """
    Set a user's role to admin or student (admin only). 
    Updates both Supabase Auth app_metadata and public.users (ground truth).
    """
    _ = current_user
    role = (request.role or "").lower().strip()
    if role not in ("admin", "student"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be 'admin' or 'student'",
        )
    try:
        await update_user_role_admin(user_id, role)
        return UpdateRoleResponse(id=user_id, role=role)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to update role: {str(e)}",
        )
