"""Conversational chat interface API router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user
from app.chat.service import ChatService


router = APIRouter(tags=["chat"])


class ChatSessionCreateRequest(BaseModel):
    course_id: str = Field(..., description="Course UUID this chat session is bound to")


class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    course_id: str


@router.post(
    "/chat/session",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_chat_session(
    request: ChatSessionCreateRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new chat session for a specific course."""
    service = ChatService()
    try:
        session = await service.create_session(
            user_id=current_user.user_id,
            course_id=request.course_id,
        )
        return ChatSessionResponse(
            id=str(session["id"]),
            user_id=str(session["user_id"]),
            course_id=str(session["course_id"]),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}",
        )


class ChatRequest(BaseModel):
    message: str = Field(..., description="Student message to the assistant")


class SourceMetadata(BaseModel):
    type: str = ""
    source: str = ""
    url: str | None = None
    category: str | None = None
    topic: str | None = None
    language: str | None = None


class SourceResponse(BaseModel):
    content: str
    metadata: SourceMetadata


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceResponse] = []


@router.post("/chat/{session_id}", response_model=ChatResponse)
async def chat(
    session_id: str = Path(..., description="Chat session UUID"),
    request: ChatRequest = ...,
    current_user: User = Depends(get_current_user),
):
    """
    Conversational chat endpoint.

    Internally routes to:
    - course-aware search
    - summarization/generation
    - follow-up handling via short history
    """
    service = ChatService()
    try:
        result = await service.chat(
            session_id=session_id,
            user_id=current_user.user_id,
            message=request.message,
        )
        
        # Format sources for response
        sources = []
        for src in result.get("sources", []):
            metadata = src.get("metadata", {})
            sources.append(SourceResponse(
                content=src.get("content", ""),
                metadata=SourceMetadata(
                    type=metadata.get("type", ""),
                    source=metadata.get("source", ""),
                    url=metadata.get("url"),
                    category=metadata.get("category"),
                    topic=metadata.get("topic"),
                    language=metadata.get("language"),
                )
            ))
        
        return ChatResponse(answer=result["answer"], sources=sources)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat: {str(e)}",
        )

