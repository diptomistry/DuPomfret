"""Services for course management, content browsing, generation, and handwritten notes."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import openai
import replicate

import logging
import re

from app.core.config import settings
from app.core.supabase import supabase
from app.utils.embeddings import get_text_embedding
from app.vectorstore.repository import VectorRepository
from app.external.knowledge import ExternalKnowledgeService


openai_client = openai.OpenAI(api_key=settings.openai_api_key)
logger = logging.getLogger(__name__)


class CourseService:
    """Service layer for courses and course-scoped operations."""

    def __init__(self) -> None:
        self.vector_repo = VectorRepository()
        self._replicate_client = replicate.Client(api_token=settings.replicate_api_token)
        self.external_knowledge = ExternalKnowledgeService()

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

    def _retrieve_generation_context(
        self,
        course_id: str,
        query: str,
        *,
        category: str | None = None,
        topic: str | None = None,
        week: int | None = None,
        language: str | None = None,
        top_k: int = 6,
        include_generated: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve course-scoped chunks to ground generation.

        Uses vector similarity over `documents` (namespace=course_id) and filters by metadata.
        """
        query_embedding = get_text_embedding(query)
        raw_chunks = self.vector_repo.similarity_search(
            query_embedding=query_embedding,
            namespace=course_id,
            top_k=max(top_k * 4, top_k),
        )

        non_image = [c for c in raw_chunks if c.get("type") != "image"]

        def _matches_filters(chunk: Dict[str, Any]) -> bool:
            # By default, do NOT ground generation in previously generated outputs.
            # Otherwise, the model can end up self-referencing instead of using uploaded lectures.
            if not include_generated:
                src = (chunk.get("source") or "").lower()
                if src in {"generated_material", "generated"}:
                    return False
                md0 = chunk.get("metadata") or {}
                if isinstance(md0, dict):
                    kind = str(md0.get("kind") or "").lower()
                    if kind.startswith("generated_"):
                        return False

            md = chunk.get("metadata") or {}

            # Category: case-insensitive exact match
            if category:
                md_category = str(md.get("category") or "").strip().lower()
                if md_category != category.strip().lower():
                    return False

            # Topic: case-insensitive exact match on stored topic
            if topic:
                md_topic = md.get("topic")
                if not isinstance(md_topic, str):
                    return False
                if md_topic.strip().lower() != topic.strip().lower():
                    return False

            # Week: handle json/int/string mismatches robustly
            if week is not None:
                md_week = md.get("week")
                if md_week is None:
                    return False
                try:
                    if int(md_week) != int(week):
                        return False
                except (TypeError, ValueError):
                    return False

            # Language: case-insensitive match when present
            if language:
                md_language = str(md.get("language") or "").strip().lower()
                if md_language != language.strip().lower():
                    return False

            return True

        filtered = [c for c in non_image if _matches_filters(c)]

        # Fallback: if vector search returns nothing after filters, try a direct metadata query
        # against the documents table for this course namespace. This ensures we still
        # ground in the correct lecture/week even if the RPC or similarity search fails.
        if not filtered:
            try:
                from app.core.supabase import supabase as _supabase

                # Some deployments may store a different namespace while still
                # tagging course_id inside metadata. Fall back to filtering by
                # metadata->>course_id instead of namespace to avoid silent
                # mismatches.
                q = _supabase.table("documents").select("*").filter(
                    "metadata->>course_id", "eq", course_id
                )
                if category:
                    q = q.filter("metadata->>category", "eq", category)
                if topic:
                    q = q.filter("metadata->>topic", "eq", topic)
                if week is not None:
                    q = q.filter("metadata->>week", "eq", str(week))
                if language:
                    q = q.filter("metadata->>language", "eq", language)

                resp = q.limit(max(top_k * 2, top_k)).execute()
                docs = resp.data or []

                fallback_chunks: List[Dict[str, Any]] = []
                for d in docs:
                    fallback_chunks.append(
                        {
                            "similarity": None,
                            "content": d.get("content") or "",
                            "metadata": d.get("metadata") or {},
                            "type": d.get("type"),
                            "source": d.get("source"),
                            "file_url": d.get("file_url"),
                        }
                    )

                if fallback_chunks:
                    filtered = fallback_chunks
            except Exception as e:
                logger.warning("Fallback documents query for grounding failed: %s", str(e))

        # Lightweight lexical rerank to reduce obviously-wrong grounding.
        # (Vector similarity alone can be noisy for course PDFs.)
        keywords = [
            w
            for w in re.findall(r"[a-z0-9]+", (query or "").lower())
            if len(w) >= 3
        ]

        def _keyword_score(chunk: Dict[str, Any]) -> int:
            md = chunk.get("metadata") or {}
            topic_txt = str(md.get("topic") or "").lower() if isinstance(md, dict) else ""
            title_txt = str(md.get("title") or "").lower() if isinstance(md, dict) else ""
            content_txt = str(chunk.get("content") or "")[:800].lower()
            hay = f"{topic_txt} {title_txt} {content_txt}"
            return sum(1 for kw in keywords if kw and kw in hay)

        filtered.sort(
            key=lambda c: (
                float(c.get("similarity", 0.0) or 0.0),
                _keyword_score(c),
            ),
            reverse=True,
        )

        top = filtered[:top_k]
        # If we have no lexical overlap at all and the caller didn't force filters,
        # treat it as "not grounded enough" rather than hallucinating.
        if keywords and week is None and topic is None:
            best_overlap = max((_keyword_score(c) for c in top), default=0)
            if best_overlap == 0:
                raise ValueError(
                    "No relevant grounded context found for this topic. "
                    "Ensure the lecture/material covering it is uploaded+ingested, "
                    "or pass week/topic_filter to constrain grounding."
                )

        return top

    def _format_sources(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sources: List[Dict[str, Any]] = []
        for chunk in chunks:
            sources.append(
                {
                    "content": chunk.get("content", ""),
                    "metadata": {
                        "type": chunk.get("type", "unknown"),
                        "source": chunk.get("source", "unknown"),
                        "url": chunk.get("file_url"),
                        **((chunk.get("metadata") or {}) if isinstance(chunk.get("metadata"), dict) else {}),
                    },
                }
            )
        return sources

    def _grounding_score(self, chunks: List[Dict[str, Any]]) -> float | None:
        if not chunks:
            return None
        sims: List[float] = []
        for c in chunks:
            try:
                sims.append(float(c.get("similarity", 0.0)))
            except Exception:
                continue
        if not sims:
            return None
        # Similarity is already cosine-like in [0..1-ish]; clamp to [0,1]
        avg = sum(sims) / len(sims)
        return max(0.0, min(1.0, avg))

    async def generate_theory_material(
        self,
        course_id: str,
        topic: str,
        depth: str,
        format: str,
        week: int | None,
        topic_filter: str | None,
        created_by: str,
    ) -> Dict[str, Any]:
        allowed_formats = {"notes", "slides", "pdf"}
        if format not in allowed_formats:
            raise ValueError(f"Invalid format: {format}. Must be one of: {sorted(allowed_formats)}")

        # Retrieve grounding context from uploaded materials
        retrieved: List[Dict[str, Any]] = []
        try:
            retrieved = self._retrieve_generation_context(
                course_id=course_id,
                query=f"{topic} {depth}",
                category="theory",
                week=week,
                topic=topic_filter,
                top_k=6,
            )
        except ValueError as e:
            # No course grounding found - this is OK, we'll use external knowledge
            logger.info(f"No course grounding for topic '{topic}': {str(e)}")
            retrieved = []

        # Fetch external knowledge when grounding is weak or missing
        external_refs: List[Dict[str, Any]] = []
        try:
            score = self._grounding_score(retrieved)
            if len(retrieved) < 3 or (score is not None and score < 0.55):
                external_refs = await self.external_knowledge.enrich_topic(topic)
        except Exception:
            # Never fail generation because Wikipedia is unavailable
            external_refs = []
        
        # If we have no course content AND no external knowledge, we can't generate
        if not retrieved and not external_refs:
            raise ValueError(
                f"No course materials or external knowledge found for topic '{topic}'. "
                "Please upload course materials or try a different topic."
            )

        context_lines: List[str] = []
        for i, ch in enumerate(retrieved, start=1):
            md = ch.get("metadata") or {}
            label = f"S{i} (week={md.get('week')}, topic={md.get('topic')}, type={md.get('content_type')}, url={md.get('file_url')})"
            snippet = (ch.get("content") or "").strip()
            context_lines.append(f"[{label}]\n{snippet}")
        context_block = "\n\n".join(context_lines)

        external_lines: List[str] = []
        for i, ext in enumerate(external_refs, start=1):
            label = f"E{i} (source={ext.get('source')}, title={ext.get('title')}, url={ext.get('url')})"
            snippet = str(ext.get("extract") or "").strip()
            if snippet:
                external_lines.append(f"[{label}]\n{snippet}")
        external_block = "\n\n".join(external_lines)

        format_instruction = {
            "notes": "Produce structured reading notes in Markdown (headings, bullets, short examples).",
            "slides": "Produce a slide outline: 8-14 slides. For each slide: a title + 3-6 bullets. Use Markdown.",
            "pdf": "Produce a handout-style document in Markdown suitable for conversion to PDF (sections, definitions, examples).",
        }[format]

        # Adjust prompt based on what sources we have
        if retrieved and external_refs:
            grounding_instruction = (
                "Grounding rules:\n"
                "- PRIMARY: Use the course excerpts (S1, S2, ...) as the factual source.\n"
                "- SECONDARY: If the course excerpts are incomplete, you MAY use external references (E1, E2, ...) to fill gaps.\n"
                "- Always cite: [S#] for course excerpts, [E#] for external references.\n"
            )
            course_section = "=== COURSE EXCERPTS (PRIMARY) ===\n" + context_block + "\n"
            external_section = "\n=== EXTERNAL REFERENCES (SECONDARY) ===\n" + external_block + "\n" if external_block else ""
        elif retrieved:
            grounding_instruction = (
                "Grounding rules:\n"
                "- Use ONLY the course excerpts (S1, S2, ...) as the factual source.\n"
                "- If something isn't in the excerpts, say it's not covered in the provided materials.\n"
                "- Always cite: [S#] for course excerpts.\n"
            )
            course_section = "=== COURSE EXCERPTS ===\n" + context_block + "\n"
            external_section = ""
        else:
            # Only external knowledge available
            grounding_instruction = (
                "Grounding rules:\n"
                "- Use the external references (E1, E2, ...) as the factual source.\n"
                "- Note: This topic is not covered in course materials, so external knowledge is being used.\n"
                "- Always cite: [E#] for external references.\n"
            )
            course_section = ""
            external_section = "=== EXTERNAL REFERENCES ===\n" + external_block + "\n" if external_block else ""
        
        prompt = (
            "You are generating course learning material.\n"
            f"Course ID: {course_id}\n"
            f"Topic: {topic}\n"
            f"Depth: {depth}\n"
            f"Format: {format}\n\n"
            f"{grounding_instruction}\n"
            f"{format_instruction}\n\n"
            f"{course_section}"
            f"{external_section}"
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert CS teacher. Stay grounded in provided excerpts and cite them.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1200,
        )
        output_text = completion.choices[0].message.content.strip()

        # Store in generated_materials
        grounding_score = self._grounding_score(retrieved)
        insert_resp = (
            supabase.table("generated_materials")
            .insert(
                {
                    "course_id": course_id,
                    "category": "theory",
                    "prompt": prompt,
                    "output": output_text,
                    "supported_languages": ["en"],
                    "grounding_score": grounding_score,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not insert_resp.data:
            raise ValueError("Failed to store generated theory material")

        material = insert_resp.data[0]
        # Attach sources in response (not persisted)
        sources = self._format_sources(retrieved)
        for ext in external_refs:
            sources.append(
                {
                    "content": str(ext.get("extract") or ""),
                    "metadata": {
                        "type": "external",
                        "source": str(ext.get("source") or "wikipedia"),
                        "url": ext.get("url") or None,
                        "title": ext.get("title") or None,
                    },
                }
            )
        material["sources"] = sources

        # Optionally embed into documents for RAG
        try:
            embedding = get_text_embedding(output_text)
            metadata = {
                "course_id": course_id,
                "material_id": material["id"],
                "category": "theory",
                "topic": topic,
                "kind": "generated_theory",
                "format": format,
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
        except Exception as e:
            # Do not fail the generation endpoint if embedding/indexing fails.
            logger.warning("Failed to embed generated theory material into RAG: %s", str(e))

        return material

    async def generate_lab_material(
        self,
        course_id: str,
        topic: str,
        language: str,
        week: int | None,
        topic_filter: str | None,
        created_by: str,
    ) -> Dict[str, Any]:
        supported_languages = ["python", "java", "c++", "javascript", "go"]
        if language.lower() not in {l.lower() for l in supported_languages}:
            raise ValueError(
                f"Unsupported language: {language}. Supported: {', '.join(supported_languages)}"
            )

        # Retrieve grounding context from uploaded materials
        retrieved: List[Dict[str, Any]] = []
        try:
            retrieved = self._retrieve_generation_context(
                course_id=course_id,
                query=f"{topic} implementation {language}",
                category="lab",
                week=week,
                topic=topic_filter,
                language=language,
                top_k=6,
            )
        except ValueError:
            # No language-specific lab content found, try without language filter
            try:
                retrieved = self._retrieve_generation_context(
                    course_id=course_id,
                    query=f"{topic} implementation {language}",
                    category="lab",
                    week=week,
                    topic=topic_filter,
                    top_k=6,
                )
            except ValueError as e:
                # No course grounding found - this is OK, we'll use external knowledge
                logger.info(f"No course grounding for lab topic '{topic}': {str(e)}")
                retrieved = []

        # Optional external knowledge (SECONDARY) when grounding is weak.
        # For labs, use external refs only for conceptual explanations, not for copying code.
        external_refs: List[Dict[str, Any]] = []
        try:
            score = self._grounding_score(retrieved)
            if len(retrieved) < 3 or (score is not None and score < 0.55):
                external_refs = await self.external_knowledge.enrich_topic(topic)
        except Exception:
            external_refs = []
        
        # If we have no course content AND no external knowledge, we can't generate
        if not retrieved and not external_refs:
            raise ValueError(
                f"No course materials or external knowledge found for lab topic '{topic}'. "
                "Please upload course materials or try a different topic."
            )

        context_lines: List[str] = []
        for i, ch in enumerate(retrieved, start=1):
            md = ch.get("metadata") or {}
            label = f"S{i} (lang={md.get('language')}, week={md.get('week')}, topic={md.get('topic')}, url={md.get('file_url')})"
            snippet = (ch.get("content") or "").strip()
            context_lines.append(f"[{label}]\n{snippet}")
        context_block = "\n\n".join(context_lines)

        external_lines: List[str] = []
        for i, ext in enumerate(external_refs, start=1):
            label = f"E{i} (source={ext.get('source')}, title={ext.get('title')}, url={ext.get('url')})"
            snippet = str(ext.get("extract") or "").strip()
            if snippet:
                external_lines.append(f"[{label}]\n{snippet}")
        external_block = "\n\n".join(external_lines)

        # Adjust prompt based on what sources we have
        if retrieved and external_refs:
            grounding_instruction = (
                "Grounding rules:\n"
                "- PRIMARY: Use the course excerpts (S1, S2, ...) as the factual/implementation reference.\n"
                "- SECONDARY: If the excerpts are incomplete, you MAY use external references (E1, E2, ...) for definitions/high-level explanations.\n"
                "- Do NOT copy external code verbatim; prioritize course patterns and write original code.\n"
                "- Always cite: [S#] for course excerpts, [E#] for external references.\n"
            )
            course_section = "=== COURSE EXCERPTS (PRIMARY) ===\n" + context_block + "\n"
            external_section = "\n=== EXTERNAL REFERENCES (SECONDARY) ===\n" + external_block + "\n" if external_block else ""
        elif retrieved:
            grounding_instruction = (
                "Grounding rules:\n"
                "- Use ONLY the course excerpts (S1, S2, ...) as the factual/implementation reference.\n"
                "- If something isn't in the excerpts, say it's not covered.\n"
                "- Always cite: [S#] for course excerpts.\n"
            )
            course_section = "=== COURSE EXCERPTS ===\n" + context_block + "\n"
            external_section = ""
        else:
            # Only external knowledge available
            grounding_instruction = (
                "Grounding rules:\n"
                "- Use the external references (E1, E2, ...) for conceptual explanations.\n"
                "- Note: This topic is not covered in course materials, so external knowledge is being used.\n"
                "- Write original code based on the concepts, do NOT copy code verbatim.\n"
                "- Always cite: [E#] for external references.\n"
            )
            course_section = ""
            external_section = "=== EXTERNAL REFERENCES ===\n" + external_block + "\n" if external_block else ""
        
        prompt = (
            "You are generating LAB learning material.\n"
            f"Course ID: {course_id}\n"
            f"Topic: {topic}\n"
            f"Language: {language}\n\n"
            f"{grounding_instruction}\n"
            "Output requirements:\n"
            "- Short conceptual intro\n"
            "- Step-by-step algorithm explanation\n"
            "- Clean, commented code in the requested language\n"
            "- 1-2 small test cases\n"
            "- Ensure code is syntactically correct\n\n"
            f"{course_section}"
            f"{external_section}"
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a lab instructor. Stay grounded in provided excerpts and cite them.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=1400,
        )
        output_text = completion.choices[0].message.content.strip()

        grounding_score = self._grounding_score(retrieved)
        insert_resp = (
            supabase.table("generated_materials")
            .insert(
                {
                    "course_id": course_id,
                    "category": "lab",
                    "prompt": prompt,
                    "output": output_text,
                    "supported_languages": supported_languages,
                    "grounding_score": grounding_score,
                    "created_by": created_by,
                }
            )
            .execute()
        )
        if not insert_resp.data:
            raise ValueError("Failed to store generated lab material")

        material = insert_resp.data[0]
        sources = self._format_sources(retrieved)
        for ext in external_refs:
            sources.append(
                {
                    "content": str(ext.get("extract") or ""),
                    "metadata": {
                        "type": "external",
                        "source": str(ext.get("source") or "wikipedia"),
                        "url": ext.get("url") or None,
                        "title": ext.get("title") or None,
                    },
                }
            )
        material["sources"] = sources

        try:
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
        except Exception as e:
            logger.warning("Failed to embed generated lab material into RAG: %s", str(e))

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
        try:
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
        except Exception as e:
            logger.warning("Failed to embed handwritten note into RAG: %s", str(e))

        return note

