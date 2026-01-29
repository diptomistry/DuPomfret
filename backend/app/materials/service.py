"""Service for validation & evaluation of generated materials."""

from __future__ import annotations

from typing import Any, Dict

import openai

from app.core.config import settings
from app.core.supabase import supabase


openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class MaterialValidationService:
    """Runs lightweight validation over generated materials and stores reports."""

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

        # Use OpenAI to get a qualitative assessment
        prompt = (
            "You are validating an AI-generated educational material for a university CS course.\n\n"
            "Assess the following on:\n"
            "1) Syntax soundness (no obvious code/logic errors)\n"
            "2) Grounding in standard textbook knowledge\n"
            "3) Whether it would likely pass simple test cases (where applicable)\n\n"
            "Return a JSON object with keys: syntax ('pass' or 'fail'), "
            "grounding_score (0..1), tests_passed (true/false), final_verdict (short string).\n\n"
            f"Material:\n{material['output']}\n"
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return ONLY a JSON object with the requested keys.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=400,
        )
        content = completion.choices[0].message.content.strip()

        # Try to parse JSON; if parsing fails, fall back to a sane default
        import json

        try:
            parsed = json.loads(content)
            syntax_status = parsed.get("syntax", "unknown")
            grounding_score = float(parsed.get("grounding_score", 0.0))
            tests_passed = bool(parsed.get("tests_passed", False))
            final_verdict = parsed.get("final_verdict", "unknown")
        except Exception:
            syntax_status = "unknown"
            grounding_score = 0.0
            tests_passed = False
            final_verdict = "validation_failed"

        # Store validation report
        insert_resp = (
            supabase.table("validation_reports")
            .insert(
                {
                    "material_id": material_id,
                    "validation_type": "ai_review",
                    "score": grounding_score,
                    "feedback": final_verdict,
                    "passed": tests_passed,
                }
            )
            .execute()
        )
        _ = insert_resp.data  # not strictly used

        return {
            "syntax": syntax_status,
            "grounding_score": grounding_score,
            "tests_passed": tests_passed,
            "final_verdict": final_verdict,
        }

