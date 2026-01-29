"""RAG service for question answering with retrieval."""
from typing import List, Dict, Any
import openai
from app.core.config import settings
from app.utils.embeddings import get_text_embedding
from app.vectorstore.repository import VectorRepository
from app.rag.prompts import build_rag_prompt


# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=settings.openai_api_key)


class RAGService:
    """Service for Retrieval-Augmented Generation."""
    
    def __init__(self):
        self.vector_repo = VectorRepository()
    
    async def _answer_from_chunks(
        self, question: str, retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not retrieved_chunks:
            return {
                "answer": "I don't know based on the provided information.",
                "sources": []
            }
        
        # Build prompt with context
        prompt = build_rag_prompt(question, retrieved_chunks)
        
        # Call OpenAI Chat Completion
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Using cost-effective model for hackathon
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions based only on provided context."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for more deterministic answers
            max_tokens=500
        )
        
        answer = response.choices[0].message.content.strip()
        
        # Format sources
        sources = []
        for chunk in retrieved_chunks:
            sources.append({
                "content": chunk.get("content", ""),
                "metadata": {
                    "type": chunk.get("type", "unknown"),
                    "source": chunk.get("source", "unknown"),
                    "url": chunk.get("file_url"),
                    "user_id": chunk.get("user_id")
                }
            })
        
        return {
            "answer": answer,
            "sources": sources
        }

    async def query_for_course(
        self,
        course_id: str,
        question: str,
        category: str | None = None,
        topic: str | None = None,
        language: str | None = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG within a single course.

        - `namespace` is the course_id
        - Filters on metadata: category, topic, language
        """
        question_embedding = get_text_embedding(question)

        # Overfetch a bit so that metadata filtering still leaves enough chunks
        raw_chunks = self.vector_repo.similarity_search(
            query_embedding=question_embedding,
            namespace=course_id,
            top_k=max(top_k * 4, top_k),
        )

        # Exclude image documents from RAG context
        non_image = [c for c in raw_chunks if c.get("type") != "image"]

        def _matches_filters(chunk: Dict[str, Any]) -> bool:
            md = chunk.get("metadata") or {}
            if category and md.get("category") != category:
                return False
            if topic and md.get("topic") != topic:
                return False
            if language and md.get("language") != language:
                return False
            return True

        filtered = [c for c in non_image if _matches_filters(c)]
        filtered = filtered[:top_k]

        return await self._answer_from_chunks(question, filtered)

    async def query_for_user(
        self,
        user_id: str,
        question: str,
        category: str | None = None,
        topic: str | None = None,
        language: str | None = None,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG across all documents owned by a user.
        """
        question_embedding = get_text_embedding(question)

        # Overfetch to allow for filtering
        raw_chunks = self.vector_repo.similarity_search_by_user(
            query_embedding=question_embedding,
            user_id=user_id,
            top_k=max(top_k * 4, top_k),
        )

        # Exclude image documents from RAG context
        non_image = [c for c in raw_chunks if c.get("type") != "image"]

        def _matches_filters(chunk: Dict[str, Any]) -> bool:
            md = chunk.get("metadata") or {}
            if category and md.get("category") != category:
                return False
            if topic and md.get("topic") != topic:
                return False
            if language and md.get("language") != language:
                return False
            return True

        filtered = [c for c in non_image if _matches_filters(c)]
        filtered = filtered[:top_k]

        return await self._answer_from_chunks(question, filtered)
