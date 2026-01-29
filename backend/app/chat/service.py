"""Conversational chat service built on top of course RAG + generation."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import openai

from app.core.config import settings
from app.core.supabase import supabase
from app.rag.service import RAGService
from app.ingest.service import IngestionService
from app.courses.service import CourseService
from app.materials.service import MaterialValidationService


openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class ChatService:
    """Manages chat sessions and messages, and routes queries via RAG + LLM."""

    def __init__(self) -> None:
        self.rag = RAGService()
        self.ingest = IngestionService()
        self.courses = CourseService()
        self.validator = MaterialValidationService()

    async def create_session(self, user_id: str, course_id: str) -> Dict[str, Any]:
        resp = (
            supabase.table("chat_sessions")
            .insert({"user_id": user_id, "course_id": course_id})
            .execute()
        )
        if not resp.data:
            raise ValueError("Failed to create chat session")
        return resp.data[0]

    async def get_session(self, session_id: str) -> Dict[str, Any]:
        resp = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .single()
            .execute()
        )
        if not resp.data:
            raise ValueError("Chat session not found")
        return resp.data

    async def get_messages(self, session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        resp = (
            supabase.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return resp.data or []

    async def append_message(
        self,
        session_id: str,
        role: str,
        content: str,
    ) -> None:
        supabase.table("chat_messages").insert(
            {"session_id": session_id, "role": role, "content": content}
        ).execute()

    async def ensure_course_content_embedded(self, course_id: str) -> None:
        """
        Check if course content is embedded in vector DB, trigger ingestion if needed.
        """
        try:
            # Check if we have any embedded documents for this course
            existing_docs = supabase.table("documents").select("id").eq("namespace", course_id).limit(1).execute()
            
            print(f"Checking embeddings for course {course_id}...")
            print(f"Existing embedded documents: {len(existing_docs.data) if existing_docs.data else 0}")
            
            if existing_docs.data:
                # Already has embedded content
                print("Course content already embedded, skipping ingestion")
                return
                
            # Get unembedded course content
            content_resp = supabase.table("course_contents").select("*").eq("course_id", course_id).execute()
            
            print(f"Found {len(content_resp.data) if content_resp.data else 0} course content items to ingest")
            
            if not content_resp.data:
                # No course content to embed
                print("No course content found to embed")
                return
                
            # Trigger ingestion for each piece of content
            for content in content_resp.data:
                try:
                    print(f"Ingesting content: {content['title']} ({content['content_type']})")
                    result = await self.ingest.ingest_course_content(
                        course_id=content["course_id"],
                        category=content["category"],
                        content_type=content["content_type"],
                        file_url=content["file_url"],
                        title=content["title"],
                        week=content.get("week"),
                        topic=content.get("topic"),
                        tags=content.get("tags", []),
                        language=content.get("language"),
                        created_by=content.get("created_by"),
                    )
                    print(f"Successfully ingested {result.get('chunks', 0)} chunks for {content['title']}")
                except Exception as e:
                    # Log but don't fail the chat - some content might not be ingestable
                    print(f"Failed to ingest content {content['id']}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    continue
                    
        except Exception as e:
            # Log but don't fail the chat if auto-ingestion fails
            print(f"Auto-ingestion error for course {course_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            pass

    def _detect_intent(self, message: str) -> Tuple[str, Dict[str, Any]]:
        """
        Lightweight intent detection for chat messages.

        Returns:
            (intent_type, payload)

        intent_type:
            - "qa": default RAG Q&A / explanation
            - "generate_theory": generate theory material
            - "generate_lab": generate lab material

        payload:
            - For generate_theory: { "topic": str, "depth": str, "format": str }
            - For generate_lab: { "topic": str, "language": str }
        """
        text = (message or "").strip()
        lower = text.lower()

        def _extract_language() -> Optional[str]:
            # Very simple language hint extraction: look for "in python", "in java", etc.
            known_langs = ["python", "java", "c++", "javascript", "js", "typescript", "ts", "go"]
            for lang in known_langs:
                token = f"in {lang}"
                if token in lower:
                    # Normalize common aliases
                    if lang in {"js", "typescript", "ts"}:
                        return "javascript"
                    return "c++" if lang == "c++" else lang
            return None

        # Heuristic: if user explicitly mentions "lab" + a generation verb, treat as lab generation
        generation_verbs = ["generate", "create", "design", "write", "build", "make", "draft"]
        has_generation_verb = any(v in lower for v in generation_verbs)
        mentions_lab = any(k in lower for k in ["lab", "practical", "exercise", "assignment", "coding task"])
        mentions_theory = any(k in lower for k in ["theory", "notes", "slides", "handout", "lecture"])

        if has_generation_verb and mentions_lab:
            language = _extract_language() or "python"
            return (
                "generate_lab",
                {
                    # Use full message as topic; generation service will use it for grounding/query
                    "topic": text,
                    "language": language,
                },
            )

        if has_generation_verb and mentions_theory:
            # Default to exam-oriented notes if user doesn't specify
            depth = "exam-oriented"
            fmt = "notes"
            if "slides" in lower:
                fmt = "slides"
            elif "pdf" in lower or "handout" in lower:
                fmt = "pdf"
            return (
                "generate_theory",
                {
                    "topic": text,
                    "depth": depth,
                    "format": fmt,
                },
            )

        # Fallback: if user strongly hints at "generate X material" without saying theory/lab,
        # prefer theory notes as a safe default.
        if has_generation_verb and "material" in lower:
            return (
                "generate_theory",
                {
                    "topic": text,
                    "depth": "exam-oriented",
                    "format": "notes",
                },
            )

        return "qa", {}

    async def chat(
        self,
        session_id: str,
        user_id: str,
        message: str,
    ) -> Dict[str, Any]:
        """
        Route chat through:
        - course-aware RAG search
        - summarization / generation
        - conversational follow-up
        """
        session = await self.get_session(session_id)
        if session["user_id"] != user_id:
            raise PermissionError("Session does not belong to the current user")

        course_id = session["course_id"]

        # Store user message
        await self.append_message(session_id=session_id, role="user", content=message)

        # 1) First check if course content is embedded, trigger ingestion if needed
        await self.ensure_course_content_embedded(course_id)

        # 2) Lightweight intent detection to support generation flows from chat
        intent, intent_payload = self._detect_intent(message)

        # If the user is asking to generate new theory or lab materials,
        # route to the existing course generation services instead of generic Q&A.
        if intent == "generate_theory":
            print(f"[ChatService] Detected generate_theory intent for course {course_id}")
            material = await self.courses.generate_theory_material(
                course_id=course_id,
                topic=intent_payload.get("topic", message),
                depth=intent_payload.get("depth", "exam-oriented"),
                format=intent_payload.get("format", "notes"),
                week=None,
                topic_filter=None,
                created_by=user_id,
            )

            validation_result: Optional[Dict[str, Any]] = None
            try:
                validation_result = await self.validator.validate_material(material_id=str(material["id"]))
            except Exception as e:
                # Validation is best-effort; don't break chat if it fails
                print(f"[ChatService] Validation failed for material {material.get('id')}: {str(e)}")

            answer = material.get("output", "").strip()
            if not answer:
                answer = "The generation service returned an empty result. Please try rephrasing your request."

            await self.append_message(session_id=session_id, role="assistant", content=answer)

            return {
                "answer": answer,
                "sources": material.get("sources", []),
                "mode": "generate_theory",
                "material_id": str(material.get("id")),
                "validation": validation_result,
            }

        if intent == "generate_lab":
            print(f"[ChatService] Detected generate_lab intent for course {course_id}")
            material = await self.courses.generate_lab_material(
                course_id=course_id,
                topic=intent_payload.get("topic", message),
                language=intent_payload.get("language", "python"),
                week=None,
                topic_filter=None,
                created_by=user_id,
            )

            validation_result: Optional[Dict[str, Any]] = None
            try:
                validation_result = await self.validator.validate_material(material_id=str(material["id"]))
            except Exception as e:
                print(f"[ChatService] Validation failed for material {material.get('id')}: {str(e)}")

            answer = material.get("output", "").strip()
            if not answer:
                answer = "The lab generation service returned an empty result. Please try rephrasing your request or specifying the language."

            await self.append_message(session_id=session_id, role="assistant", content=answer)

            return {
                "answer": answer,
                "sources": material.get("sources", []),
                "mode": "generate_lab",
                "material_id": str(material.get("id")),
                "validation": validation_result,
            }

        # 3) Default path: RAG-backed Q&A / explanation
        # Retrieve course-aware context via RAG service
        top_k = 6
        if any(keyword in message.lower() for keyword in ["part", "section", "chapter", "specific", "explain"]):
            top_k = 12  # Get more chunks for specific queries
            print(f"Detected specific query, increasing top_k to {top_k}")

        rag_result = await self.rag.query_for_course(
            course_id=course_id,
            question=message,
            category=None,
            topic=None,
            language=None,
            top_k=top_k,
        )

        # Debug: Check what we got from RAG
        print(f"RAG result sources count: {len(rag_result.get('sources', []))}")
        if not rag_result.get("sources"):
            print(f"No RAG sources found for course_id: {course_id}, message: {message}")
            # Check if documents exist in the database
            doc_check = (
                supabase.table("documents")
                .select("id")
                .eq("namespace", course_id)
                .limit(5)
                .execute()
            )
            print(f"Documents in DB for this course: {len(doc_check.data) if doc_check.data else 0}")

        # Build a conversational prompt that includes brief history
        history = await self.get_messages(session_id=session_id, limit=10)
        history_text = ""
        for msg in history:
            history_text += f"{msg['role']}: {msg['content']}\n"

        # Build context with more structure
        context_snippets = []
        for idx, src in enumerate(rag_result.get("sources", []), 1):
            snippet = f"[Source {idx}]"
            metadata = src.get('metadata', {})
            if metadata.get('topic'):
                snippet += f" Topic: {metadata['topic']}"
            if metadata.get('week'):
                snippet += f" Week {metadata['week']}"
            snippet += f"\n{src['content']}\n"
            context_snippets.append(snippet)
        
        context_text = "\n".join(context_snippets)

        system_prompt = (
            "You are a helpful teaching assistant for a university course. "
            "You have access to course materials including PDFs, slides, and documents. "
            "Use the retrieved context to answer questions accurately. "
            "If the question asks about a specific part, section, or topic, focus on that information. "
            "If the context doesn't contain the specific information requested, say so clearly. "
            "Provide detailed explanations with examples when available in the context.\n\n"
            "IMPORTANT FORMATTING RULES:\n"
            "- Use **bold** for headings, section titles, and important terms\n"
            "- Use numbered lists (1., 2., 3.) for steps or main points\n"
            "- Use bullet points (- ) for sub-points\n"
            "- Use `inline code` for technical terms, commands, or short code snippets\n"
            "- Use code blocks with language tags for longer code examples:\n"
            "  ```python\n"
            "  # code here\n"
            "  ```\n"
            "- Use > for important notes or quotes\n"
            "- Structure your response with clear sections using **Section Name**:\n"
            "- Add line breaks between sections for readability\n"
            "- Use emphasis (*text*) for definitions or key concepts"
        )
        user_prompt = (
            f"Conversation history:\n{history_text}\n\n"
            f"Course materials retrieved:\n{context_text}\n\n"
            f"Student question: {message}\n\n"
            "Instructions:\n"
            "- Answer based on the course materials above\n"
            "- If the question asks about a specific part/section, find and explain that part\n"
            "- Format your response using markdown for better readability\n"
            "- Use bold for headings, code blocks for code, and proper structure\n"
            "- Be thorough and provide all relevant details from the materials\n"
            "- If information is incomplete, acknowledge what's missing"
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1200,  # Increased for more detailed answers
        )
        answer = completion.choices[0].message.content.strip()

        # Persist assistant message
        await self.append_message(session_id=session_id, role="assistant", content=answer)

        return {
            "answer": answer,
            "sources": rag_result.get("sources", []),
            "mode": "qa",
            "material_id": None,
            "validation": None,
        }

