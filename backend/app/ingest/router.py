"""Course content ingestion API router."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user, require_admin
from app.ingest.service import IngestionService
from app.vectorstore.repository import VectorRepository
from app.core.supabase import supabase
from app.storage.service import CloudflareUploadService


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
    title: Optional[str] = Field(None, description="Display title for the material")
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
    Ingest a single piece of course content (admin-only).
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
            title=request.title,
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



@router.delete("/{content_id}", status_code=status.HTTP_200_OK)
async def delete_course_content(
    content_id: str,
    current_user: User = Depends(require_admin),
):
    """
    Delete a course content item and its associated documents (admin-only).
    Also attempts to delete the underlying file from storage when possible.
    """
    # 1) Fetch the content row
    try:
        resp = supabase.table("course_contents").select("*").eq("id", content_id).execute()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    row = resp.data[0]
    course_id = row.get("course_id")
    file_url = row.get("file_url")

    # 2) Delete documents for that content_id within the namespace (course_id)
    deleted_docs = 0
    try:
        vr = VectorRepository()
        deleted_docs = vr.delete_documents_by_content_id(namespace=course_id, content_id=str(content_id))
    except Exception:
        # continue even if vector deletion fails
        deleted_docs = 0

    # 3) Delete CMS row
    try:
        supabase.table("course_contents").delete().eq("id", content_id).execute()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to delete content row: {str(e)}")

    # 4) Attempt to delete file from storage (best-effort)
    storage_deleted = False
    try:
        if file_url:
            storage = CloudflareUploadService()
            storage_deleted = storage.delete_object_by_url(file_url)
    except Exception:
        storage_deleted = False

    return {
        "message": "Deleted content",
        "deleted_documents": deleted_docs,
        "storage_deleted": storage_deleted,
    }
