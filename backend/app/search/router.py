"""Search API router (retrieval-only, course-scoped)."""

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import User, get_current_user
from app.core.supabase import supabase
from app.search.service import SearchService
from app.vectorstore.repository import VectorRepository
from app.utils.embeddings import get_text_embedding


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


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., description="Text query to search course materials")
    course_id: Optional[str] = Field(
        default=None, description="Optional course UUID to scope search"
    )
    top_k: int = Field(8, ge=1, le=100, description="Number of results to return")


class SemanticSearchResult(BaseModel):
    id: str
    score: float
    snippet: str
    source: str
    component: str


@router.post("/search", response_model=List[SemanticSearchResult])
async def semantic_search(
    request: SemanticSearchRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Top-level semantic search. If `course_id` is provided the search is scoped to that
    course; otherwise the search runs across the current user's documents.
    """
    _ = current_user
    repo = VectorRepository()

    try:
        # Embedding generation can fail due to provider errors/rate limits.
        try:
            query_embedding = get_text_embedding(request.query)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Embedding provider unavailable or rate-limited: {str(e)}",
            )

        if request.course_id:
            raw = repo.similarity_search(
                query_embedding=query_embedding,
                namespace=request.course_id,
                top_k=max(request.top_k * 4, request.top_k),
            )
        else:
            # Search across user's documents
            raw = repo.similarity_search_by_user(
                query_embedding=query_embedding,
                user_id=current_user.id,
                top_k=max(request.top_k * 4, request.top_k),
            )

        results = []
        for i, doc in enumerate(raw[: request.top_k]):
            md = doc.get("metadata") or {}
            content = doc.get("content", "") or ""
            snippet = content if len(content) <= 500 else content[:500] + "..."
            doc_id = (
                doc.get("id")
                or (f"{md.get('content_id','')}: {md.get('chunk_index','')}")
                or str(i)
            )
            source = md.get("source") or doc.get("source") or md.get("content_type") or ""
            component = md.get("category") or "theory"
            score = float(doc.get("similarity") or 0.0)

            results.append(
                {
                    "id": str(doc_id),
                    "score": score,
                    "snippet": snippet,
                    "source": source,
                    "component": component,
                }
            )

        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform semantic search: {str(e)}",
        )
