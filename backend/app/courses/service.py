"""Services for course management, content browsing, generation, and handwritten notes."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import openai
import replicate

from app.core.config import settings
from app.core.supabase import supabase
from app.utils.embeddings import get_text_embedding
from app.vectorstore.repository import VectorRepository


openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class CourseService:
    """Service layer for courses and course-scoped operations."""

    def __init__(self) -> None:
        self.vector_repo = VectorRepository()
        self._replicate_client = replicate.Client(api_token=settings.replicate_api_token)

    # ----------------------
    # 1. Course management
    # ----------------------

    async def create_course(
        self,
        code: str,
        title: str,
        description: Optional[str],
        created_by: str,
    ) -> Dict[str, Any]:
        resp = (
            supabase.table("courses")
            .insert(
                {
                    "code": code,
                    "title": title,
                    "description": description,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not resp.data:
            raise ValueError("Failed to create course")
        return resp.data[0]

    async def list_courses(self) -> List[Dict[str, Any]]:
        resp = supabase.table("courses").select("*").order("created_at").execute()
        return resp.data or []

    async def get_course(self, course_id: str) -> Dict[str, Any]:
        resp = (
            supabase.table("courses")
            .select("*")
            .eq("id", course_id)
            .single()
            .execute()
        )
        if not resp.data:
            raise ValueError("Course not found")
        return resp.data

    # ----------------------
    # 2. Content browsing
    # ----------------------

    async def list_course_contents(
        self,
        course_id: str,
        category: Optional[str],
        week: Optional[int],
    ) -> List[Dict[str, Any]]:
        query = supabase.table("course_contents").select("*").eq("course_id", course_id)
        if category:
            query = query.eq("category", category)
        if week is not None:
            query = query.eq("week", week)
        resp = query.order("week").order("created_at").execute()
        return resp.data or []

    # ----------------------
    # 3. AI generation (theory & lab)
    # ----------------------

    async def generate_theory_material(
        self,
        course_id: str,
        topic: str,
        depth: str,
        created_by: str,
    ) -> Dict[str, Any]:
        prompt = (
            f"You are generating EXAM-ORIENTED theory notes for a university course.\n"
            f"Course ID: {course_id}\n"
            f"Topic: {topic}\n"
            f"Depth: {depth}\n\n"
            "Write clear, concise, step-by-step notes suitable for Bangladeshi university exams. "
            "Include definitions, key properties, and small worked examples if relevant."
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert CS teacher writing rigorous, exam-focused notes.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1200,
        )
        output_text = completion.choices[0].message.content.strip()

        # Store in generated_materials
        insert_resp = (
            supabase.table("generated_materials")
            .insert(
                {
                    "course_id": course_id,
                    "category": "theory",
                    "prompt": prompt,
                    "output": output_text,
                    "supported_languages": ["en"],
                    "grounding_score": None,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not insert_resp.data:
            raise ValueError("Failed to store generated theory material")

        material = insert_resp.data[0]

        # Optionally embed into documents for RAG
        embedding = get_text_embedding(output_text)
        metadata = {
            "course_id": course_id,
            "material_id": material["id"],
            "category": "theory",
            "topic": topic,
            "kind": "generated_theory",
        }
        self.vector_repo.insert_documents(
            contents=[output_text],
            embeddings=[embedding],
            metadata_list=[metadata],
            types=["text"],
            sources=["generated_material"],
            file_urls=[None],
            namespace=course_id,
        )

        return material

    async def generate_lab_material(
        self,
        course_id: str,
        topic: str,
        language: str,
        created_by: str,
    ) -> Dict[str, Any]:
        prompt = (
            f"Generate a detailed lab-style explanation and {language} code for the topic:\n"
            f"{topic}\n\n"
            "Include:\n"
            "- Short conceptual intro\n"
            "- Step-by-step algorithm explanation\n"
            "- Clean, commented code in the requested language\n"
            "- 1-2 small test cases."
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a lab instructor helping students understand and implement algorithms.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=1400,
        )
        output_text = completion.choices[0].message.content.strip()

        insert_resp = (
            supabase.table("generated_materials")
            .insert(
                {
                    "course_id": course_id,
                    "category": "lab",
                    "prompt": prompt,
                    "output": output_text,
                    "supported_languages": [language],
                    "grounding_score": None,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not insert_resp.data:
            raise ValueError("Failed to store generated lab material")

        material = insert_resp.data[0]

        embedding = get_text_embedding(output_text)
        metadata = {
            "course_id": course_id,
            "material_id": material["id"],
            "category": "lab",
            "topic": topic,
            "language": language,
            "kind": "generated_lab",
        }
        self.vector_repo.insert_documents(
            contents=[output_text],
            embeddings=[embedding],
            metadata_list=[metadata],
            types=["text"],
            sources=["generated_material"],
            file_urls=[None],
            namespace=course_id,
        )

        return material

    # ----------------------
    # 6. Handwritten notes
    # ----------------------

    async def ingest_handwritten_note(
        self,
        course_id: str,
        image_url: str,
        created_by: str,
    ) -> Dict[str, Any]:
        """
        OCR → (optionally) LaTeX → RAG embedding for handwritten notes.
        """
        # 1) OCR via Replicate
        ocr_output = self._replicate_client.run(
            "abiruyt/text-extract-ocr:a524caeaa23495bc9edc805ab08ab5fe943afd3febed884a4f3747aa32e9cd61",
            input={"image": image_url},
        )
        # Model returns plain text string
        ocr_text: str = str(ocr_output or "").strip()

        if not ocr_text:
            raise ValueError("OCR returned empty text for the provided image")

        # 2) Convert to LaTeX-ish representation using OpenAI (optional but nice)
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Convert the following handwritten math/CS notes into clean LaTeX.",
                },
                {"role": "user", "content": ocr_text},
            ],
            temperature=0.1,
            max_tokens=1200,
        )
        latex_output = completion.choices[0].message.content.strip()

        # 3) Store in handwritten_notes
        insert_resp = (
            supabase.table("handwritten_notes")
            .insert(
                {
                    "course_id": course_id,
                    "original_image_url": image_url,
                    "latex_output": latex_output,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not insert_resp.data:
            raise ValueError("Failed to store handwritten note")

        note = insert_resp.data[0]

        # 4) Embed into documents for RAG
        embedding = get_text_embedding(latex_output or ocr_text)
        metadata = {
            "course_id": course_id,
            "handwritten_note_id": note["id"],
            "source": "handwritten",
        }
        self.vector_repo.insert_documents(
            contents=[latex_output or ocr_text],
            embeddings=[embedding],
            metadata_list=[metadata],
            types=["text"],
            sources=["handwritten_note"],
            file_urls=[image_url],
            namespace=course_id,
        )

        return note

