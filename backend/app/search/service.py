"""Search service for retrieval-only use cases."""

from typing import Any, Dict, List, Optional

from app.utils.embeddings import get_text_embedding
from app.vectorstore.repository import VectorRepository


class SearchService:
    """Service for retrieval-only search (no LLM answering)."""

    def __init__(self):
        self.vector_repo = VectorRepository()

    def _filter_image_results(
        self,
        raw: List[Dict[str, Any]],
        top_k: int,
        min_similarity: Optional[float],
    ) -> List[Dict[str, Any]]:
        images: List[Dict[str, Any]] = []
        for item in raw:
            if item.get("type") != "image":
                continue

            similarity = float(item.get("similarity", 0.0))
            if min_similarity is not None and similarity < min_similarity:
                continue

            images.append(
                {
                    "url": item.get("file_url"),
                    "similarity": similarity,
                    "content": item.get("content", ""),
                    "metadata": item.get("metadata", {}) or {},
                }
            )
            if len(images) >= top_k:
                break

        return images

    async def search_images(
        self,
        query: str,
        namespace: str,
        top_k: int = 12,
        overfetch: int = 5,
        min_similarity: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for images matching a text query (CLIP text->image retrieval) within a namespace.
        """
        query_embedding = get_text_embedding(query)

        raw = self.vector_repo.similarity_search(
            query_embedding=query_embedding,
            namespace=namespace,
            top_k=max(top_k * overfetch, top_k),
        )

        return self._filter_image_results(raw, top_k, min_similarity)

    async def search_images_for_user(
        self,
        query: str,
        user_id: str,
        top_k: int = 12,
        overfetch: int = 5,
        min_similarity: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for images across ALL namespaces for a specific user.
        """
        query_embedding = get_text_embedding(query)

        raw = self.vector_repo.similarity_search_by_user(
            query_embedding=query_embedding,
            user_id=user_id,
            top_k=max(top_k * overfetch, top_k),
        )

        return self._filter_image_results(raw, top_k, min_similarity)

