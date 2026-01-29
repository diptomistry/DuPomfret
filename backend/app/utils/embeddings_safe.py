"""Safe embedding helpers that enforce consistent embedding dimensions.

This wraps the existing replicate CLIP embedding functions and ensures that
every returned embedding matches the expected embedding dimension. If the
provider returns a vector with the wrong size, we will pad with zeros or
truncate to the configured dimension and log a warning. This prevents runtime
errors during similarity calculations or vector DB inserts when embeddings
have inconsistent lengths.
"""
from typing import Any, List

from app.utils.embeddings import (
    embedding_dimension,
    get_text_embedding as _get_text_embedding,
    get_image_embedding as _get_image_embedding,
)


def _coerce_embedding(vec: List[float], expected: int) -> List[float]:
    """Pad with zeros or truncate to match expected length."""
    if len(vec) == expected:
        return vec
    if len(vec) > expected:
        # Truncate and warn
        print(
            f"[embeddings_safe] Warning: truncating embedding from {len(vec)} to {expected}"
        )
        return vec[:expected]
    # Pad with zeros
    print(
        f"[embeddings_safe] Warning: padding embedding from {len(vec)} to {expected} with zeros"
    )
    return vec + [0.0] * (expected - len(vec))


def get_text_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Batch wrapper around the single-text embedding function that enforces
    consistent embedding dimensions.
    """
    if not texts:
        return []
    expected = embedding_dimension()
    embeddings: List[List[float]] = []
    for t in texts:
        try:
            vec = _get_text_embedding(t)
        except Exception as e:
            # If the provider fails for one chunk, log and fallback to zeros.
            print(f"[embeddings_safe] Embedding provider error for text chunk: {e}")
            embeddings.append([0.0] * expected)
            continue

        # Coerce to expected dimension
        try:
            coerced = _coerce_embedding(vec, expected)
        except Exception as e:
            print(f"[embeddings_safe] Failed to coerce embedding: {e}")
            coerced = [0.0] * expected
        embeddings.append(coerced)

    return embeddings


def get_image_embedding(image_url: str) -> List[float]:
    """
    Wrapper around image embedding that enforces consistent dimension.
    """
    expected = embedding_dimension()
    try:
        vec = _get_image_embedding(image_url)
    except Exception as e:
        print(f"[embeddings_safe] Image embedding provider error: {e}")
        return [0.0] * expected

    return _coerce_embedding(vec, expected)

