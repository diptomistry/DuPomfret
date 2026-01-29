"""Conversational chat service built on top of course RAG + generation."""

from __future__ import annotations

from typing import Any, Dict, List

import openai

from app.core.config import settings
from app.core.supabase import supabase
from app.rag.service import RAGService
from app.ingest.service import IngestionService


openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class ChatService:
    """Manages chat sessions and messages, and routes queries via RAG + LLM."""

    def __init__(self) -> None:
        self.rag = RAGService()
        self.ingest = IngestionService()

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

        # 2) Retrieve course-aware context via RAG service
        rag_result = await self.rag.query_for_course(
            course_id=course_id,
            question=message,
            category=None,
            topic=None,
            language=None,
            top_k=6,
        )
        
        # Debug: Check what we got from RAG
        print(f"RAG result sources count: {len(rag_result.get('sources', []))}")
        if not rag_result.get("sources"):
            print(f"No RAG sources found for course_id: {course_id}, message: {message}")
            # Check if documents exist in the database
            doc_check = supabase.table("documents").select("id").eq("namespace", course_id).limit(5).execute()
            print(f"Documents in DB for this course: {len(doc_check.data) if doc_check.data else 0}")

        # Build a conversational prompt that includes brief history
        history = await self.get_messages(session_id=session_id, limit=10)
        history_text = ""
        for msg in history:
            history_text += f"{msg['role']}: {msg['content']}\n"

        context_snippets = "\n\n".join(
            f"- {src['content']}" for src in rag_result.get("sources", [])
        )

        system_prompt = (
            "You are a helpful teaching assistant for a university CS course. "
            "Use the retrieved context from course materials as your primary source of truth. "
            "If something is unclear from the context, say so explicitly."
        )
        user_prompt = (
            f"Conversation so far:\n{history_text}\n\n"
            f"Retrieved course context:\n{context_snippets}\n\n"
            f"Student message:\n{message}\n\n"
            "Respond concisely, with clear steps and code examples where appropriate."
        )

        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        answer = completion.choices[0].message.content.strip()

        # Persist assistant message
        await self.append_message(session_id=session_id, role="assistant", content=answer)

        # Return the full RAG result (includes answer and sources)
        return {
            "answer": answer,
            "sources": rag_result.get("sources", []),
        }

