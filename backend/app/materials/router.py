"""Validation & evaluation API router for generated materials."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel

from app.core.auth import User, get_current_user
from app.materials.service import MaterialValidationService


router = APIRouter(tags=["materials"])


class MaterialValidationResponse(BaseModel):
    syntax: str
    grounding_score: float
    tests_passed: bool
    final_verdict: str


@router.post(
    "/materials/{material_id}/validate",
    response_model=MaterialValidationResponse,
)
async def validate_material(
    material_id: str = Path(..., description="Generated material UUID"),
    current_user: User = Depends(get_current_user),
):
    """
    Run validation & evaluation passes on a generated material.
    """
    _ = current_user
    service = MaterialValidationService()
    try:
        result = await service.validate_material(material_id=material_id)
        return MaterialValidationResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate material: {str(e)}",
        )

