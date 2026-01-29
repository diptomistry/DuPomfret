"""Code validation service for lab / snippet checking."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import ast
import json
import logging

import openai

from app.core.config import settings


logger = logging.getLogger(__name__)
openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class CodeValidationService:
    """
    Performs lightweight validation for code snippets.

    Goals:
    - Basic syntax / compilation-style checks (Python via `ast.parse`)
    - Language consistency (respect requested language)
    - Optional test-like qualitative assessment using OpenAI
    """

    async def validate(self, code: str, language: str) -> Dict[str, Any]:
        language_normalized = (language or "").strip().lower()
        diagnostics: List[str] = []
        tests_passed: Optional[bool] = None

        # 1) Local syntax checks where feasible (Python)
        syntax_ok_local = True
        if language_normalized in {"python", "py"}:
            try:
                ast.parse(code)
            except SyntaxError as exc:
                syntax_ok_local = False
                diagnostics.append(
                    f"Python syntax error at line {exc.lineno}, col {exc.offset}: {exc.msg}"
                )

        # 2) LLM-based qualitative validation (covers other languages + logic)
        # Keep the prompt compact and deterministic.
        validation_prompt = (
            "You are validating a student lab code snippet.\n\n"
            f"Language (as requested by the user): {language_normalized or 'unknown'}\n"
            "The platform may already have run simple static checks (e.g. Python AST parse). "
            f"Those checks reported syntax_ok_local = {str(syntax_ok_local).lower()}.\n\n"
            "Your tasks:\n"
            "1) Check whether the code is written in the requested language (or a very close variant).\n"
            "2) Check for obvious syntax errors or constructs that would prevent compilation/interpretation.\n"
            "3) Check for glaring logic issues that would obviously fail simple, natural test cases.\n\n"
            "Return ONLY a JSON object with keys:\n"
            "  - is_valid: boolean (true only if the code is in the requested language AND you see no blocking syntax errors)\n"
            "  - diagnostics: array of short strings describing any issues or warnings (empty if everything looks good)\n"
            "  - tests_passed: boolean or null (null if you cannot confidently infer test results).\n\n"
            "Code snippet to validate:\n"
            "```"
            f"{language_normalized or ''}\n"
            f"{code}\n"
            "```"
        )

        is_valid = syntax_ok_local

        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Return ONLY a JSON object with keys is_valid, diagnostics, tests_passed.",
                    },
                    {"role": "user", "content": validation_prompt},
                ],
                temperature=0,
                max_tokens=300,
            )
            content = (completion.choices[0].message.content or "").strip()

            parsed = json.loads(content)
            if isinstance(parsed, dict):
                raw_is_valid = parsed.get("is_valid", is_valid)
                if isinstance(raw_is_valid, bool):
                    is_valid = raw_is_valid

                raw_diagnostics = parsed.get("diagnostics", [])
                if isinstance(raw_diagnostics, list):
                    for item in raw_diagnostics:
                        if isinstance(item, str) and item not in diagnostics:
                            diagnostics.append(item)

                raw_tests = parsed.get("tests_passed", None)
                if isinstance(raw_tests, bool):
                    tests_passed = raw_tests
        except Exception as e:
            logger.warning("LLM-based code validation failed: %s", str(e))

        # If local syntax failed, force is_valid = False even if the model was optimistic.
        if not syntax_ok_local:
            is_valid = False

        return {
            "is_valid": bool(is_valid),
            "diagnostics": diagnostics,
            "tests_passed": tests_passed,
        }

