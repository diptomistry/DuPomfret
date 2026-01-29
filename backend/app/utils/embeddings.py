"""Embedding generation utilities (Replicate CLIP)."""

from __future__ import annotations

from typing import Any, List

from app.core.config import settings


def embedding_dimension() -> int:
    """Embedding vector dimension for the configured CLIP model."""
    # The referenced CLIP embeddings model typically returns 768 dims.
    # If you swap the model to one with different dims, update your DB vector size accordingly.
    return 768


def _validate_embedding(vec: List[float]) -> List[float]:
    expected = embedding_dimension()
    if len(vec) != expected:
        raise ValueError(
            f"Embedding dim mismatch: got {len(vec)} but expected {expected}. "
            f"Update `sql/schema.sql` (vector size) and your Supabase function to match."
        )
    return vec


def _replicate_client():
    import replicate  # lazy import

    return replicate.Client(api_token=settings.replicate_api_token)


def _replicate_clip_embedding_from_output(output: Any) -> List[float]:
    # Most Replicate models return a dict like {"embedding": [...]}
    if isinstance(output, dict) and "embedding" in output and isinstance(output["embedding"], list):
        return output["embedding"]
    raise ValueError(f"Unexpected Replicate output format: {type(output)}")


def get_text_embedding(text: str) -> List[float]:
    """
    Generate CLIP embedding for text using Replicate.
    
    Args:
        text: Input text to embed
        
    Returns:
        List[float] embedding vector (typically 768-d)
    """
    client = _replicate_client()
    output = client.run(settings.replicate_clip_embeddings_model, input={"text": text})
    return _validate_embedding(_replicate_clip_embedding_from_output(output))


def get_image_embedding(image_url: str) -> List[float]:
    """
    Generate an embedding for an image.

    Args:
        image_url: URL of the image to embed

    Returns:
        List[float] embedding vector (typically 768-d)
    """
    client = _replicate_client()
    output = client.run(settings.replicate_clip_embeddings_model, input={"image": image_url})
    return _validate_embedding(_replicate_clip_embedding_from_output(output))


def get_text_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in batch.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embeddings (typically 768-d)
    """
    if not texts:
        return []
    # Replicate model is typically single-input; do simple sequential calls.
    return [get_text_embedding(t) for t in texts]
