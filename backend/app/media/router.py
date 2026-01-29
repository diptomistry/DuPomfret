"""Educational media generation API router."""

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import User, get_current_user
from app.media.service import MediaGenerationService


router = APIRouter(prefix="", tags=["media"])


class CourseMediaGenerationRequest(BaseModel):
    """Request model for **educational** media generation."""

    type: str = Field(
        ...,
        description=(
            "Educational media type: "
            "'content-to-video', 'slides-to-video', or 'theory-diagram'"
        ),
    )
    material_id: str = Field(
        ..., description="Related material UUID (e.g. generated_materials.id)"
    )
    style: str = Field(
        "lecture",
        description="Presentation style, e.g. 'lecture', 'whiteboard', 'explainer'",
    )


class MediaGenerationResponse(BaseModel):
    """Response model for media generation."""

    type: str
    url: str
    prompt: str
    input_images: Optional[list[str]] = None


@router.post(
    "/courses/{course_id}/media/generate",
    response_model=MediaGenerationResponse,
)
async def generate_course_media(
    course_id: str = Path(..., description="Course UUID"),
    request: CourseMediaGenerationRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Generate **course-scoped, educational** media only.

    Allowed:
    - content-to-video   → lecture-style video summary from course material
    - slides-to-video    → explainer video from slide-like material
    - theory-diagram     → static diagram for theory concepts

    Arbitrary creative prompts, image editing, and non-educational use cases are not supported.
    """
    _ = current_user  # keep auth enforced
    service = MediaGenerationService()

    allowed_types = {"content-to-video", "slides-to-video", "theory-diagram"}
    if request.type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid type: {request.type}. Must be one of: {sorted(allowed_types)}",
        )

    try:
        if request.type in {"content-to-video", "slides-to-video"}:
            result = await service.generate_educational_video(
                course_id=course_id,
                material_id=request.material_id,
                mode=request.type,
                style=request.style,
            )
        elif request.type == "theory-diagram":
            result = await service.generate_theory_diagram(
                course_id=course_id,
                material_id=request.material_id,
                style=request.style,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported type: {request.type}",
            )

        return MediaGenerationResponse(
            type=result["type"],
            url=result["url"],
            prompt=result["prompt"],
            input_images=result.get("input_images"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate media: {str(e)}",
        )
