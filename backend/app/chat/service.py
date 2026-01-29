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
        # Increase top_k for more specific queries
        top_k = 6
        if any(keyword in message.lower() for keyword in ['part', 'section', 'chapter', 'specific', 'explain']):
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
            doc_check = supabase.table("documents").select("id").eq("namespace", course_id).limit(5).execute()
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

        # Return the full RAG result (includes answer and sources)
        return {
            "answer": answer,
            "sources": rag_result.get("sources", []),
        }

