"""Text chunking utilities for RAG."""
from typing import List


def chunk_text(text: str, chunk_size: int = 350, overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks.
    
    Args:
        text: Input text to chunk
        chunk_size: Maximum size of each chunk in characters
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text or len(text) <= chunk_size:
        return [text] if text else []
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        
        # Move start position forward by chunk_size - overlap
        start += chunk_size - overlap
        
        # If we've reached the end, break
        if end >= len(text):
            break
    
    return chunks
