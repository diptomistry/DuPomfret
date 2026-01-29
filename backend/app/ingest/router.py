"""Course content ingestion API router."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user, require_admin
from app.ingest.service import IngestionService


router = APIRouter(prefix="/admin/content", tags=["ingest"])


class AdminContentIngestRequest(BaseModel):
    """Request model for course content ingestion."""

    course_id: str = Field(..., description="Course UUID")
    category: str = Field(..., description="Content category: 'theory' or 'lab'")
    content_type: str = Field(
        ...,
        description="Underlying type: 'slide', 'pdf', 'code', 'note', or 'image'",
    )
    file_url: str = Field(..., description="Cloud storage URL (e.g. R2) of the content")
    week: Optional[int] = Field(None, description="Course week number")
    topic: Optional[str] = Field(None, description="Topic title, e.g. 'AVL Tree'")
    tags: Optional[List[str]] = Field(
        default=None, description="List of tags, e.g. ['tree', 'rotation']"
    )
    language: Optional[str] = Field(
        default=None, description="Language for lab/code content (e.g. 'python')"
    )


class AdminContentIngestResponse(BaseModel):
    """Response model for course content ingestion."""

    message: str
    chunks: int
    content_id: str


@router.post(
    "/ingest",
    response_model=AdminContentIngestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_course_content(
    request: AdminContentIngestRequest,
    current_user: User = Depends(require_admin),
):
    """
    Ingest a single piece of course content into:
    - `course_contents` (CMS row)
    - `documents` (chunked + embedded, namespace = course_id)

    Admin-only endpoint.
    """
    service = IngestionService()

    try:
        result = await service.ingest_course_content(
            course_id=request.course_id,
            category=request.category,
            content_type=request.content_type,
            file_url=request.file_url,
            week=request.week,
            topic=request.topic,
            tags=request.tags or [],
            language=request.language,
            created_by=current_user.user_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest course content: {str(e)}",
        )

    return AdminContentIngestResponse(
        message="Ingested course content successfully",
        chunks=result["chunks"],
        content_id=result["content_id"],
    )
