"""
API Router for Handwritten Notes Digitization
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import base64
import logging

from app.core.auth import get_current_user, User
from app.notes.service import NotesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])


# Pydantic models
class NoteCreate(BaseModel):
    image_data: str  # Base64 encoded image
    course_id: Optional[str] = None


class NoteUpdate(BaseModel):
    latex_output: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    created_by: str
    course_id: Optional[str]
    original_image_url: str
    latex_output: Optional[str]
    created_at: str


@router.post("/upload", response_model=NoteResponse)
async def upload_handwritten_note(
    note_data: NoteCreate,
    user: User = Depends(get_current_user)
):
    """
    Upload and process a handwritten note image
    
    - **image_data**: Base64 encoded image data
    - **course_id**: Optional course ID to associate the note with
    """
    try:
        service = NotesService()
        result = await service.process_handwritten_note(
            user_id=user.user_id,
            image_data=note_data.image_data,
            course_id=note_data.course_id
        )
        return result
    except Exception as e:
        logger.error(f"Error uploading note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-file")
async def upload_handwritten_note_file(
    file: UploadFile = File(...),
    course_id: Optional[str] = Form(None),
    user: User = Depends(get_current_user)
):
    """
    Upload handwritten note as a file (alternative to base64)
    
    - **file**: Image file (PNG, JPG, JPEG)
    - **course_id**: Optional course ID
    """
    try:
        # Validate file type
        if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
            raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported")
        
        # Read and encode file
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        image_data = f"data:{file.content_type};base64,{base64_image}"
        
        # Process note
        service = NotesService()
        result = await service.process_handwritten_note(
            user_id=user.user_id,
            image_data=image_data,
            course_id=course_id
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading note file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[NoteResponse])
async def get_user_notes(
    course_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """
    Get all notes for the current user
    
    - **course_id**: Optional filter by course
    """
    try:
        service = NotesService()
        notes = await service.get_user_notes(
            user_id=user.user_id,
            course_id=course_id
        )
        return notes
    except Exception as e:
        logger.error(f"Error fetching notes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user: User = Depends(get_current_user)
):
    """
    Get a specific note by ID
    """
    try:
        service = NotesService()
        note = await service.get_note_by_id(note_id, user.user_id)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    update_data: NoteUpdate,
    user: User = Depends(get_current_user)
):
    """
    Update note content
    
    - **latex_output**: Edit LaTeX content
    """
    try:
        service = NotesService()
        result = await service.update_note(
            note_id=note_id,
            user_id=user.user_id,
            latex_output=update_data.latex_output
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    user: User = Depends(get_current_user)
):
    """
    Delete a note
    """
    try:
        service = NotesService()
        success = await service.delete_note(note_id, user.user_id)
        
        if success:
            return {"message": "Note deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Note not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
