"""Search API router (retrieval-only, course-scoped)."""

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user
from app.core.supabase import supabase
from app.search.service import SearchService


router = APIRouter(prefix="", tags=["search"])


class ImageSearchRequest(BaseModel):
    query: str = Field(
        ..., description="Text query to search images (e.g. 'AVL tree diagram')"
    )
    top_k: int = Field(8, ge=1, le=100, description="Number of image results to return")
    min_similarity: float | None = Field(
        None,
        description="Optional cosine similarity threshold (0..1-ish depending on embeddings)",
    )


class ImageSearchResult(BaseModel):
    url: str | None
    similarity: float
    content: str
    metadata: dict


class ImageSearchResponse(BaseModel):
    results: list[ImageSearchResult]


class NamespaceListResponse(BaseModel):
    namespaces: list[str]


@router.post("/courses/{course_id}/search/images", response_model=ImageSearchResponse)
async def search_course_images(
    course_id: str = Path(..., description="Course UUID"),
    request: ImageSearchRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Course-scoped image search.

    Uses `namespace = course_id` and returns only image documents.
    """
    _ = current_user  # keep auth enforced
    service = SearchService()

    try:
        results = await service.search_images(
            query=request.query,
            namespace=course_id,
            top_k=request.top_k,
            min_similarity=request.min_similarity,
        )
        return ImageSearchResponse(results=[ImageSearchResult(**r) for r in results])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search images: {str(e)}",
        )


@router.get("/namespaces", response_model=NamespaceListResponse)
async def list_namespaces(
    current_user: User = Depends(get_current_user),
):
    """
    List distinct namespaces currently present in the documents table.

    Useful for populating a namespace dropdown in the UI.
    Requires authentication via Bearer token.
    """
    _ = current_user
    try:
        resp = (
            supabase.table("documents")
            .select("namespace")
            .neq("namespace", "")
            .order("namespace")
            .execute()
        )
        namespaces = sorted(
            {row["namespace"] for row in (resp.data or []) if row.get("namespace")}
        )
        return NamespaceListResponse(namespaces=namespaces)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list namespaces: {str(e)}",
        )
