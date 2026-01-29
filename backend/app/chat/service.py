"""Conversational chat service built on top of course RAG + generation."""

from __future__ import annotations

from typing import Any, Dict, List

import openai

from app.core.config import settings
from app.core.supabase import supabase
from app.rag.service import RAGService


openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class ChatService:
    """Manages chat sessions and messages, and routes queries via RAG + LLM."""

    def __init__(self) -> None:
        self.rag = RAGService()

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

        # 1) Retrieve course-aware context via RAG
        rag_result = await self.rag.query_for_course(
            course_id=course_id,
            question=message,
            category=None,
            topic=None,
            language=None,
            top_k=6,
        )

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

        return {"answer": answer}

