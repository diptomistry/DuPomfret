"""Service for validation & evaluation of generated materials."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import json
import logging
import re

import openai

from app.core.config import settings
from app.core.supabase import supabase
from app.courses.service import CourseService


logger = logging.getLogger(__name__)
openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class MaterialValidationService:
    """
    Runs validation over AI-generated materials and stores reports.

    Responsibilities:
    - Re-ground the material against uploaded course contents (slides, PDFs, notes, code)
    - Ask an LLM to qualitatively judge syntax / logic and test-likeness
    - Persist a compact validation report for auditability
    """

    def __init__(self) -> None:
        self._course_service = CourseService()

    async def validate_material(self, material_id: str) -> Dict[str, Any]:
        # Fetch material
        resp = (
            supabase.table("generated_materials")
            .select("*")
            .eq("id", material_id)
            .single()
            .execute()
        )
        if not resp.data:
            raise ValueError("Material not found")

        material = resp.data
        course_id: Optional[str] = material.get("course_id")
        category: Optional[str] = material.get("category")
        prompt_text: str = material.get("prompt") or ""
        output_text: str = material.get("output") or ""

        # Best-effort extraction of topic & language from the stored prompt
        topic: Optional[str] = None
        language: Optional[str] = None
        try:
            topic_match = re.search(r"^Topic:\s*(.+)$", prompt_text, flags=re.MULTILINE)
            if topic_match:
                topic = topic_match.group(1).strip()
            lang_match = re.search(
                r"^Language:\s*(.+)$", prompt_text, flags=re.MULTILINE
            )
            if lang_match:
                language = lang_match.group(1).strip()
        except Exception:
            # Never fail validation because of prompt parsing
            pass

        # 1) Retrieve grounded context from uploaded course materials
        retrieved: List[Dict[str, Any]] = []
        grounding_score: float = 0.0

        if course_id:
            try:
                retrieved = self._course_service._retrieve_generation_context(
                    course_id=course_id,
                    query=(topic or output_text[:256] or "course material"),
                    category=category,
                    topic=topic,
                    language=language if category == "lab" else None,
                    top_k=6,
                    include_generated=False,
                )
                score = self._course_service._grounding_score(retrieved)
                if score is not None:
                    grounding_score = float(score)
            except Exception as e:
                logger.warning(
                    "Grounding retrieval for material %s failed: %s",
                    material_id,
                    str(e),
                )

        # Fallback to stored generation-time grounding_score if available
        if (
            not grounding_score
            and isinstance(material.get("grounding_score"), (int, float))
            and material["grounding_score"] is not None
        ):
            try:
                grounding_score = float(material["grounding_score"])
            except (TypeError, ValueError):
                grounding_score = 0.0

        # Build a compact context block (S1, S2, ...) from retrieved chunks
        context_lines: List[str] = []
        for i, ch in enumerate(retrieved, start=1):
            md = ch.get("metadata") or {}
            label = f"S{i} (week={md.get('week')}, topic={md.get('topic')}, type={md.get('content_type')}, url={md.get('file_url')})"
            snippet = (ch.get("content") or "").strip()
            if snippet:
                context_lines.append(f"[{label}]\n{snippet}")
        context_block = "\n\n".join(context_lines) if context_lines else "No context found."

        # 2) Ask OpenAI to qualitatively validate the material (syntax / relevance / tests)
        category_for_prompt = category or "unknown"
        language_for_prompt = language or ("n/a" if category_for_prompt != "lab" else "unknown")

        validation_prompt = (
            "You are validating an AI-generated educational material for a university CS course.\n\n"
            f"Category: {category_for_prompt}\n"
            f"Topic: {topic or 'unknown'}\n"
            f"Language (for lab/code, if applicable): {language_for_prompt}\n\n"
            "You are given a set of course excerpts (S1, S2, ...) that come ONLY from the instructor's uploaded materials "
            "such as slides, PDFs, notes, and reference code. You are also given the AI-generated material to validate.\n\n"
            "Your tasks:\n"
            "1) Check whether the material stays factually aligned with the excerpts and course-level topics.\n"
            "2) For lab/code content, check that the code is in the requested language, has no obvious syntax errors, "
            "   and would likely pass simple test cases described in the material.\n"
            "3) For theory-only content, focus on conceptual correctness, correct use of definitions, and avoiding unsupported claims.\n\n"
            "Return ONLY a JSON object with the following keys:\n"
            "  - syntax: 'pass', 'fail', or 'not_applicable'\n"
            "  - tests_passed: true, false, or null if not applicable\n"
            "  - final_verdict: short string summary, e.g. 'ready_for_students', 'needs_minor_fixes', or 'unsafe_or_incorrect'.\n\n"
            "Do not include any additional fields or commentary.\n\n"
            "=== COURSE EXCERPTS ===\n"
            f"{context_block}\n\n"
            "=== MATERIAL TO VALIDATE ===\n"
            f"{output_text}\n"
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return ONLY a JSON object with the requested keys.",
                },
                {"role": "user", "content": validation_prompt},
            ],
            temperature=0,
            max_tokens=400,
        )
        content = (completion.choices[0].message.content or "").strip()

        # Try to parse JSON; if parsing fails, fall back to a sane default
        syntax_status = "unknown"
        tests_passed: Optional[bool] = None
        final_verdict = "validation_failed"

        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                raw_syntax = parsed.get("syntax", "unknown")
                if isinstance(raw_syntax, str):
                    syntax_status = raw_syntax
                raw_tests = parsed.get("tests_passed", None)
                if isinstance(raw_tests, bool):
                    tests_passed = raw_tests
                final = parsed.get("final_verdict", final_verdict)
                if isinstance(final, str):
                    final_verdict = final
        except Exception:
            # Leave defaults
            pass

        # Normalize tests_passed for storage and API shape
        tests_passed_normalized = bool(tests_passed) if tests_passed is not None else False

        # Store validation report
        insert_resp = (
            supabase.table("validation_reports")
            .insert(
                {
                    "material_id": material_id,
                    "validation_type": "ai_review",
                    "score": grounding_score,
                    "feedback": final_verdict,
                    "passed": tests_passed_normalized,
                }
            )
            .execute()
        )
        _ = insert_resp.data  # not strictly used

        return {
            "syntax": syntax_status,
            "grounding_score": grounding_score,
            "tests_passed": tests_passed_normalized,
            "final_verdict": final_verdict,
        }
