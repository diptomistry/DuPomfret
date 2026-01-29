"""Course management, content browsing, generation, and handwritten notes router."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user, require_admin
from app.courses.service import CourseService


router = APIRouter(tags=["courses"])


# ----------------------
# 1. Course management
# ----------------------


class CourseCreateRequest(BaseModel):
    code: str = Field(..., description="Course code, e.g. CSE220")
    title: str = Field(..., description="Course title")
    description: Optional[str] = Field(None, description="Optional description")


class CourseResponse(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None


@router.post(
    "/admin/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    request: CourseCreateRequest,
    current_user: User = Depends(require_admin),
):
    """
    Create a new course (admin-only).
    """
    service = CourseService()
    try:
        course = await service.create_course(
            code=request.code,
            title=request.title,
            description=request.description,
            created_by=current_user.user_id,
        )
        return CourseResponse(
            id=str(course["id"]),
            code=course["code"],
            title=course["title"],
            description=course.get("description"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create course: {str(e)}",
        )


@router.get("/courses", response_model=List[CourseResponse])
async def list_courses(
    current_user: User = Depends(get_current_user),
):
    """List all courses."""
    _ = current_user
    service = CourseService()
    courses = await service.list_courses()
    return [
        CourseResponse(
            id=str(c["id"]),
            code=c["code"],
            title=c["title"],
            description=c.get("description"),
        )
        for c in courses
    ]


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str = Path(..., description="Course UUID"),
    current_user: User = Depends(get_current_user),
):
    """Get details for a single course."""
    _ = current_user
    service = CourseService()
    try:
        c = await service.get_course(course_id)
        return CourseResponse(
            id=str(c["id"]),
            code=c["code"],
            title=c["title"],
            description=c.get("description"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ----------------------
# 2. Content browsing
# ----------------------


class CourseContentResponse(BaseModel):
    id: str
    course_id: str
    category: str
    title: str
    week: Optional[int] = None
    topic: Optional[str] = None
    tags: Optional[List[str]] = None
    content_type: str
    file_url: str
    language: Optional[str] = None


@router.get("/courses/{course_id}/contents", response_model=List[CourseContentResponse])
async def list_course_contents(
    course_id: str = Path(..., description="Course UUID"),
    category: Optional[str] = Query(
        None, description="Filter by 'theory' or 'lab' content"
    ),
    week: Optional[int] = Query(None, description="Filter by week number"),
    current_user: User = Depends(get_current_user),
):
    """
    Browse course contents (student-facing).

    Supports filters: `?category=lab&week=4`
    """
    _ = current_user
    service = CourseService()
    contents = await service.list_course_contents(
        course_id=course_id,
        category=category,
        week=week,
    )
    return [
        CourseContentResponse(
            id=str(row["id"]),
            course_id=str(row["course_id"]),
            category=row["category"],
            title=row["title"],
            week=row.get("week"),
            topic=row.get("topic"),
            tags=row.get("tags") or [],
            content_type=row["content_type"],
            file_url=row["file_url"],
            language=row.get("language"),
        )
        for row in contents
    ]


# ----------------------
# 3. AI generation (theory & lab)
# ----------------------


class GenerateTheoryRequest(BaseModel):
    topic: str = Field(..., description="Topic title, e.g. 'Binary Search Tree'")
    depth: str = Field(
        "exam-oriented",
        description="Depth/style of notes, e.g. 'exam-oriented', 'conceptual'",
    )


class GenerateLabRequest(BaseModel):
    topic: str = Field(..., description="Lab topic, e.g. 'BST insertion'")
    language: str = Field(..., description="Programming language, e.g. 'python'")


class GeneratedMaterialResponse(BaseModel):
    id: str
    course_id: str
    category: str
    prompt: str
    output: str
    supported_languages: Optional[List[str]] = None
    grounding_score: Optional[float] = None


@router.post(
    "/courses/{course_id}/generate/theory",
    response_model=GeneratedMaterialResponse,
)
async def generate_theory(
    course_id: str = Path(..., description="Course UUID"),
    request: GenerateTheoryRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """Generate exam-oriented theory material for a given topic."""
    service = CourseService()
    try:
        material = await service.generate_theory_material(
            course_id=course_id,
            topic=request.topic,
            depth=request.depth,
            created_by=current_user.user_id,
        )
        return GeneratedMaterialResponse(
            id=str(material["id"]),
            course_id=str(material["course_id"]),
            category=material["category"],
            prompt=material["prompt"],
            output=material["output"],
            supported_languages=material.get("supported_languages"),
            grounding_score=material.get("grounding_score"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate theory material: {str(e)}",
        )


@router.post(
    "/courses/{course_id}/generate/lab",
    response_model=GeneratedMaterialResponse,
)
async def generate_lab(
    course_id: str = Path(..., description="Course UUID"),
    request: GenerateLabRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """Generate lab explanation + code for a given topic in a target language."""
    service = CourseService()
    try:
        material = await service.generate_lab_material(
            course_id=course_id,
            topic=request.topic,
            language=request.language,
            created_by=current_user.user_id,
        )
        return GeneratedMaterialResponse(
            id=str(material["id"]),
            course_id=str(material["course_id"]),
            category=material["category"],
            prompt=material["prompt"],
            output=material["output"],
            supported_languages=material.get("supported_languages"),
            grounding_score=material.get("grounding_score"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lab material: {str(e)}",
        )


# ----------------------
# 6. Handwritten notes (bonus)
# ----------------------


class HandwrittenIngestRequest(BaseModel):
    image: str = Field(..., description="Public URL of the handwritten note image")


class HandwrittenNoteResponse(BaseModel):
    id: str
    course_id: str
    original_image_url: str
    latex_output: Optional[str] = None


@router.post(
    "/courses/{course_id}/handwritten/ingest",
    response_model=HandwrittenNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_handwritten(
    course_id: str = Path(..., description="Course UUID"),
    request: HandwrittenIngestRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    OCR → LaTeX → RAG ingestion for handwritten notes.
    """
    service = CourseService()
    try:
        note = await service.ingest_handwritten_note(
            course_id=course_id,
            image_url=request.image,
            created_by=current_user.user_id,
        )
        return HandwrittenNoteResponse(
            id=str(note["id"]),
            course_id=str(note["course_id"]),
            original_image_url=note["original_image_url"],
            latex_output=note.get("latex_output"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest handwritten note: {str(e)}",
        )


