"""Admin-only user management: list users, update role."""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.admin.service import list_users_admin, update_user_role_admin
from app.core.auth import User, require_admin


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
    List all users (admin only). Returns id, email, and role (from app_metadata).
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
    for u in raw_users:
        uid = u.get("id")
        if not uid:
            continue
        app_meta = u.get("app_metadata") or {}
        user_meta = u.get("user_metadata") or {}
        role = (app_meta.get("role") or user_meta.get("role") or "student")
        if isinstance(role, str):
            role = role.lower()
        if role not in ("admin", "student"):
            role = "student"
        users.append(
            UserListItem(
                id=str(uid),
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
    Set a user's role to admin or student (admin only). Stored in app_metadata.role.
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
