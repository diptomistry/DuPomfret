"""
Handwritten Notes Digitization Service
Converts handwritten notes images into structured digital formats (Markdown, LaTeX, plain text)
"""

import os
import base64
import logging
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID, uuid4

from openai import OpenAI

from app.core.supabase import supabase

logger = logging.getLogger(__name__)


class NotesService:
    """Service for processing handwritten notes into digital formats"""
    
    def __init__(self):
        self.supabase = supabase
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def process_handwritten_note(
        self,
        user_id: str,
        image_data: str,  # base64 encoded image or URL
        course_id: Optional[str] = None
    ) -> Dict:
        """
        Process a handwritten note image and convert it to LaTeX format
        
        Args:
            user_id: ID of the user uploading the note
            image_data: Base64 encoded image or image URL
            course_id: Optional course ID to associate with
            
        Returns:
            Dict containing the created note with ID
        """
        try:
            logger.info(f"Processing handwritten note for user {user_id}")
            
            # Upload image to Supabase Storage
            image_url = await self._upload_image_to_storage(user_id, image_data)
            
            # Process the image with OpenAI Vision
            try:
                latex_content = await self._digitize_with_vision(image_data)
                
                # Create database entry with result
                note_id = str(uuid4())
                note_data = {
                    "id": note_id,
                    "created_by": user_id,
                    "original_image_url": image_url,  # Store Supabase Storage URL
                    "latex_output": latex_content,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                if course_id:
                    note_data["course_id"] = course_id
                
                # Insert into database
                result = self.supabase.table("handwritten_notes").insert(note_data).execute()
                logger.info(f"Successfully processed note {note_id}")
                
                return note_data
                
            except Exception as e:
                logger.error(f"Error processing note: {str(e)}")
                raise
                
        except Exception as e:
            logger.error(f"Error creating note entry: {str(e)}")
            raise
    
    async def _upload_image_to_storage(self, user_id: str, image_data: str) -> str:
        """
        Upload base64 image to Supabase Storage
        
        Args:
            user_id: ID of the user
            image_data: Base64 encoded image
            
        Returns:
            Public URL of uploaded image
        """
        try:
            # Extract base64 data (remove data:image/...;base64, prefix if present)
            if ';base64,' in image_data:
                image_data = image_data.split(';base64,')[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(image_data)
            
            # Generate unique filename
            filename = f"{user_id}/{uuid4()}.png"
            
            # Upload to Supabase Storage
            result = self.supabase.storage.from_("handwritten-notes").upload(
                filename,
                image_bytes,
                {"content-type": "image/png"}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_("handwritten-notes").get_public_url(filename)
            
            logger.info(f"Image uploaded to storage: {filename}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading image to storage: {str(e)}")
            # Fallback: return base64 data URL if storage fails
            return image_data if image_data.startswith('data:') else f"data:image/png;base64,{image_data}"
    
    async def _digitize_with_vision(self, image_data: str) -> str:
        """
        Use OpenAI Vision API to convert handwritten notes to LaTeX format
        
        Args:
            image_data: Base64 image or URL
            
        Returns:
            LaTeX formatted content
        """
        logger.info("Calling OpenAI Vision API for handwriting recognition")
        
        # Prepare image for API
        if image_data.startswith('http'):
            image_input = image_data
        else:
            # Assume it's base64
            image_input = image_data
        
        # System prompt for academic note digitization
        system_prompt = """You are an expert at converting handwritten academic notes into complete LaTeX documents.
Your task is to:
1. Accurately transcribe all handwritten text
2. Recognize and properly format mathematical equations, formulas, and symbols using LaTeX
3. Preserve the structure (headings, lists, diagrams descriptions)
4. Generate a COMPLETE, compilable LaTeX document

For mathematical content:
- Use proper LaTeX notation for equations: \\[ \\] for display math, $ $ for inline
- Properly format matrices, integrals, derivatives, etc.
- Preserve mathematical symbols and notation
- Use amsmath, amssymb packages for advanced math

For structure:
- Use \\section{} for main headings
- Use \\subsection{} for subheadings
- Use \\begin{itemize} or \\begin{enumerate} for lists
- Use \\textbf{} for bold terms
- Describe diagrams in [DIAGRAM: description] format

IMPORTANT: Generate a COMPLETE LaTeX document with:
- \\documentclass{article}
- All necessary \\usepackage statements
- \\begin{document} and \\end{document}
- Proper document structure"""

        user_prompt = """Please digitize this handwritten note into a COMPLETE, compilable LaTeX document.

Output a full LaTeX document that can be compiled directly, including:
1. \\documentclass{article}
2. All necessary packages (amsmath, amssymb, graphicx, etc.)
3. \\begin{document}
4. The transcribed content with proper formatting
5. \\end{document}

Provide ONLY the complete LaTeX document, nothing else. No explanations, no markdown code blocks.
Focus on:
- Accuracy of transcription
- Proper formatting of equations and formulas using LaTeX notation
- Clear structure and organization
- Academic quality presentation
- Complete compilable document structure"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",  # GPT-4 with vision
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_input, "detail": "high"}
                            }
                        ]
                    }
                ],
                max_tokens=4000,
                temperature=0.2  # Lower temperature for more accurate transcription
            )
            
            # Get the LaTeX content
            latex_content = response.choices[0].message.content
            
            # Clean up markdown code blocks if present
            if "```latex" in latex_content:
                latex_content = latex_content.split("```latex")[1].split("```")[0].strip()
            elif "```" in latex_content:
                latex_content = latex_content.split("```")[1].split("```")[0].strip()
            
            return latex_content
                
        except Exception as e:
            logger.error(f"OpenAI Vision API error: {str(e)}")
            raise
    
    async def get_user_notes(
        self,
        user_id: str,
        course_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Retrieve all notes for a user
        
        Args:
            user_id: User ID
            course_id: Optional filter by course
            
        Returns:
            List of notes
        """
        try:
            query = self.supabase.table("handwritten_notes").select("*").eq("created_by", user_id)
            
            if course_id:
                query = query.eq("course_id", course_id)
            
            query = query.order("created_at", desc=True)
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Error fetching notes: {str(e)}")
            raise
    
    async def get_note_by_id(self, note_id: str, user_id: str) -> Optional[Dict]:
        """
        Get a specific note by ID
        
        Args:
            note_id: Note ID
            user_id: User ID (for security check)
            
        Returns:
            Note data or None
        """
        try:
            result = self.supabase.table("handwritten_notes")\
                .select("*")\
                .eq("id", note_id)\
                .eq("created_by", user_id)\
                .execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching note {note_id}: {str(e)}")
            raise
    
    async def delete_note(self, note_id: str, user_id: str) -> bool:
        """
        Delete a note
        
        Args:
            note_id: Note ID
            user_id: User ID (for security check)
            
        Returns:
            True if deleted successfully
        """
        try:
            self.supabase.table("handwritten_notes")\
                .delete()\
                .eq("id", note_id)\
                .eq("created_by", user_id)\
                .execute()
            
            logger.info(f"Deleted note {note_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting note {note_id}: {str(e)}")
            raise
    
    async def update_note(
        self,
        note_id: str,
        user_id: str,
        latex_output: Optional[str] = None
    ) -> Dict:
        """
        Update note content
        
        Args:
            note_id: Note ID
            user_id: User ID (for security)
            latex_output: Updated LaTeX
            
        Returns:
            Updated note data
        """
        try:
            update_data = {}
            
            if latex_output is not None:
                update_data["latex_output"] = latex_output
            
            result = self.supabase.table("handwritten_notes")\
                .update(update_data)\
                .eq("id", note_id)\
                .eq("created_by", user_id)\
                .execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error updating note {note_id}: {str(e)}")
            raise
