"""Media generation service using Replicate.

Core principle:
- All diagrams, images, and videos must be generated ONLY from *validated*
  AI-generated textual content (rows in `generated_materials` that have a
  passing validation report), never directly from the raw user prompt.
"""

import textwrap
from typing import List, Optional, Dict, Any

import replicate

from app.core.config import settings
from app.core.supabase import supabase


class MediaGenerationService:
    """Service for AI media generation using Replicate."""

    # Model mappings for different generation types
    MODELS = {
        "text-to-image": "google/nano-banana",  # Can be changed to other text-to-image models
        "image-to-image": "google/nano-banana",
        "image-editing": "google/nano-banana",
        "text-to-video": "google/veo-2",
        "image-to-video": "google/veo-2",
    }

    def __init__(self):
        self.client = replicate.Client(api_token=settings.replicate_api_token)
        if not settings.replicate_api_token:
            raise ValueError("REPLICATE_API_TOKEN is required")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_validated_material(self, material_id: str) -> Dict[str, Any]:
        """
        Fetch a generated material and ensure it has a passing validation report.

        This enforces the pipeline:
          user prompt -> RAG -> generate TEXT -> VALIDATE -> media.
        """
        # 1) Fetch material text
        mat_resp = (
            supabase.table("generated_materials")
            .select("*")
            .eq("id", material_id)
            .single()
            .execute()
        )
        if not mat_resp.data:
            raise ValueError("Material not found for media generation")

        material = mat_resp.data

        # 2) Ensure there is at least one passing validation report
        val_resp = (
            supabase.table("validation_reports")
            .select("*")
            .eq("material_id", material_id)
            .eq("validation_type", "ai_review")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        reports = val_resp.data or []
        latest = reports[0] if reports else None
        if not latest or not latest.get("passed"):
            raise ValueError(
                "Material must be validated and marked as passed before generating media."
            )

        return material
    
    async def generate_text_to_image(
        self,
        prompt: str,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate image from text prompt.
        
        Args:
            prompt: Text description of the image
            model: Optional model name (default: google/nano-banana)
            
        Returns:
            Dictionary with output URL and metadata
        """
        model_name = model or self.MODELS["text-to-image"]
        
        input_data = {
            "prompt": prompt
        }
        
        output = self.client.run(model_name, input=input_data)
        
        # Handle Replicate output - can be a string URL or iterable
        output_url = None
        if isinstance(output, str):
            output_url = output
        elif hasattr(output, 'url'):
            output_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, (str, bytes)):
            # If output is iterable (like a list), get the first item
            output_list = list(output)
            if output_list:
                output_url = str(output_list[0]) if isinstance(output_list[0], str) else getattr(output_list[0], 'url', str(output_list[0]))
        else:
            output_url = str(output)
        
        return {
            "type": "text-to-image",
            "url": output_url,
            "prompt": prompt
        }
    
    async def generate_image_to_image(
        self,
        prompt: str,
        image_urls: List[str],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate image from text prompt and input images.
        
        Args:
            prompt: Text description/instruction
            image_urls: List of input image URLs
            model: Optional model name (default: google/nano-banana)
            
        Returns:
            Dictionary with output URL and metadata
        """
        model_name = model or self.MODELS["image-to-image"]
        
        input_data = {
            "prompt": prompt,
            "image_input": image_urls
        }
        
        output = self.client.run(model_name, input=input_data)
        
        # Handle Replicate output
        output_url = None
        if isinstance(output, str):
            output_url = output
        elif hasattr(output, 'url'):
            output_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, (str, bytes)):
            output_list = list(output)
            if output_list:
                output_url = str(output_list[0]) if isinstance(output_list[0], str) else getattr(output_list[0], 'url', str(output_list[0]))
        else:
            output_url = str(output)
        
        return {
            "type": "image-to-image",
            "url": output_url,
            "prompt": prompt,
            "input_images": image_urls
        }
    
    async def generate_image_editing(
        self,
        prompt: str,
        image_urls: List[str],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Edit images based on text prompt.
        
        Args:
            prompt: Editing instructions
            image_urls: List of input image URLs to edit
            model: Optional model name (default: google/nano-banana)
            
        Returns:
            Dictionary with output URL and metadata
        """
        model_name = model or self.MODELS["image-editing"]
        
        input_data = {
            "prompt": prompt,
            "image_input": image_urls
        }
        
        output = self.client.run(model_name, input=input_data)
        
        # Handle Replicate output
        output_url = None
        if isinstance(output, str):
            output_url = output
        elif hasattr(output, 'url'):
            output_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, (str, bytes)):
            output_list = list(output)
            if output_list:
                output_url = str(output_list[0]) if isinstance(output_list[0], str) else getattr(output_list[0], 'url', str(output_list[0]))
        else:
            output_url = str(output)
        
        return {
            "type": "image-editing",
            "url": output_url,
            "prompt": prompt,
            "input_images": image_urls
        }
    
    async def generate_text_to_video(
        self,
        prompt: str,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate video from text prompt.
        
        Args:
            prompt: Text description of the video
            model: Optional model name (default: google/veo-2)
            
        Returns:
            Dictionary with output URL and metadata
        """
        model_name = model or self.MODELS["text-to-video"]
        
        input_data = {
            "prompt": prompt
        }
        
        output = self.client.run(model_name, input=input_data)
        
        # Handle Replicate output
        output_url = None
        if isinstance(output, str):
            output_url = output
        elif hasattr(output, 'url'):
            output_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, (str, bytes)):
            output_list = list(output)
            if output_list:
                output_url = str(output_list[0]) if isinstance(output_list[0], str) else getattr(output_list[0], 'url', str(output_list[0]))
        else:
            output_url = str(output)
        
        return {
            "type": "text-to-video",
            "url": output_url,
            "prompt": prompt
        }
    
    async def generate_image_to_video(
        self,
        prompt: str,
        image_urls: List[str],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate video from text prompt and input images.
        
        Args:
            prompt: Text description/instruction
            image_urls: List of input image URLs
            model: Optional model name (default: google/veo-2)
            
        Returns:
            Dictionary with output URL and metadata
        """
        model_name = model or self.MODELS["image-to-video"]
        
        input_data = {
            "prompt": prompt,
            "image_input": image_urls
        }
        
        output = self.client.run(model_name, input=input_data)
        
        # Handle Replicate output
        output_url = None
        if isinstance(output, str):
            output_url = output
        elif hasattr(output, 'url'):
            output_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, (str, bytes)):
            output_list = list(output)
            if output_list:
                output_url = str(output_list[0]) if isinstance(output_list[0], str) else getattr(output_list[0], 'url', str(output_list[0]))
        else:
            output_url = str(output)
        
        return {
            "type": "image-to-video",
            "url": output_url,
            "prompt": prompt,
            "input_images": image_urls
        }

    async def generate_educational_video(
        self,
        course_id: str,
        material_id: str,
        mode: str,
        style: str = "lecture",
    ) -> Dict[str, Any]:
        """
        Generate an **educational** video for a given course material.

        Critically, this uses only the *validated* AI-generated text as
        source content – never the raw user prompt.
        """
        material = self._get_validated_material(material_id)
        text = str(material.get("output") or "").strip()

        # Keep prompt size manageable while still grounding the video
        snippet = textwrap.shorten(text, width=1500, placeholder=" ...")

        base_prompt = (
            f"Create a {style} educational {mode.replace('-', ' ')} for university course {course_id}.\n"
            "Use ONLY the following validated course material as script content. "
            "Explain concepts clearly, step-by-step, and keep pacing suitable for students.\n\n"
            "=== VALIDATED MATERIAL START ===\n"
            f"{snippet}\n"
            "=== VALIDATED MATERIAL END ==="
        )

        result = await self.generate_text_to_video(prompt=base_prompt)
        # Override type to reflect higher-level abstraction
        result["type"] = "educational-video"
        return result

    async def generate_theory_diagram(
        self,
        course_id: str,
        material_id: str,
        style: str = "lecture",
    ) -> Dict[str, Any]:
        """
        Generate a static theory diagram image for a course concept.

        The diagram prompt is built from validated AI-generated text only.
        """
        material = self._get_validated_material(material_id)
        text = str(material.get("output") or "").strip()
        snippet = textwrap.shorten(text, width=800, placeholder=" ...")

        base_prompt = (
            f"Produce a clean, high-contrast {style} diagram for a theoretical concept "
            f"in course {course_id}.\n"
            "Base the diagram ONLY on the following validated explanation text "
            "so that it matches the lecture notes exactly.\n\n"
            "=== VALIDATED MATERIAL START ===\n"
            f"{snippet}\n"
            "=== VALIDATED MATERIAL END ==="
        )

        result = await self.generate_text_to_image(prompt=base_prompt)
        result["type"] = "theory-diagram"
        return result
