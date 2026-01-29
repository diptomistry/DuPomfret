"""Course-aware RAG API router."""

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import User, get_current_user
from app.rag.service import RAGService
from pydantic import BaseModel, Field


router = APIRouter(prefix="", tags=["rag"])


class SourceMetadata(BaseModel):
    """Metadata for a source document."""

    type: str
    source: str
    url: str | None = None
    user_id: str | None = None


class Source(BaseModel):
    """Source document information."""

    content: str
    metadata: SourceMetadata


class QueryResponse(BaseModel):
    """Response model for RAG query."""

    answer: str
    sources: list[Source]


class CourseSearchRequest(BaseModel):
    """Request model for course-aware RAG search."""

    query: str = Field(..., description="Question or query text")
    category: str | None = Field(
        default=None, description="Filter by 'theory' or 'lab' content"
    )
    topic: str | None = Field(
        default=None, description="Optional topic filter (e.g. 'AVL Tree')"
    )
    language: str | None = Field(
        default=None, description="Optional language filter (e.g. 'python')"
    )
    top_k: int = Field(
        5, ge=1, le=20, description="Number of top chunks to retrieve after filtering"
    )


@router.post("/courses/{course_id}/search", response_model=QueryResponse)
async def course_search(
    course_id: str = Path(..., description="Course UUID"),
    request: CourseSearchRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Course-scoped semantic search + answer generation.

    Uses:
    - `namespace = course_id`
    - metadata filters: `category`, `topic`, `language`
    """
    _ = current_user  # keep auth enforced
    service = RAGService()

    try:
        result = await service.query_for_course(
            course_id=course_id,
            question=request.query,
            category=request.category,
            topic=request.topic,
            language=request.language,
            top_k=request.top_k,
        )

        sources = [
            Source(
                content=src["content"],
                metadata=SourceMetadata(
                    type=src["metadata"]["type"],
                    source=src["metadata"]["source"],
                    url=src["metadata"].get("url"),
                    user_id=src["metadata"].get("user_id"),
                ),
            )
            for src in result["sources"]
        ]

        return QueryResponse(answer=result["answer"], sources=sources)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process course search: {str(e)}",
        )


class GlobalRagRequest(BaseModel):
    """Top-level RAG query across user or specific course."""

    query: str = Field(..., description="Question or query text")
    course_id: Optional[str] = Field(
        default=None, description="Optional course UUID to scope the query"
    )
    category: str | None = Field(
        default=None, description="Filter by 'theory' or 'lab' content"
    )
    topic: str | None = Field(default=None, description="Optional topic filter")
    language: str | None = Field(default=None, description="Optional language filter")
    top_k: int = Field(5, ge=1, le=20, description="Number of top chunks to retrieve")


@router.post("/rag/query", response_model=QueryResponse)
async def rag_query(
    request: GlobalRagRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Top-level RAG query. If `course_id` is provided the query is scoped to that course;
    otherwise the query searches across the current user's documents.
    """
    _ = current_user
    service = RAGService()

    try:
        if request.course_id:
            result = await service.query_for_course(
                course_id=request.course_id,
                question=request.query,
                category=request.category,
                topic=request.topic,
                language=request.language,
                top_k=request.top_k,
            )
        else:
            # Query across user's documents
            result = await service.query_for_user(
                user_id=current_user.id,
                question=request.query,
                category=request.category,
                topic=request.topic,
                language=request.language,
                top_k=request.top_k,
            )

        sources = [
            Source(
                content=src["content"],
                metadata=SourceMetadata(
                    type=src["metadata"]["type"],
                    source=src["metadata"]["source"],
                    url=src["metadata"].get("url"),
                    user_id=src["metadata"].get("user_id"),
                ),
            )
            for src in result["sources"]
        ]

        return QueryResponse(answer=result["answer"], sources=sources)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process RAG query: {str(e)}",
        )
# Only course-scoped RAG API is exposed here.
