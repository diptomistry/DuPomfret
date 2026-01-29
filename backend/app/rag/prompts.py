"""Prompt templates for RAG."""
from typing import List, Dict, Any


def build_rag_prompt(question: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Build prompt for RAG with retrieved context.
    
    Args:
        question: User's question
        context_chunks: List of retrieved document chunks with content and metadata
        
    Returns:
        Formatted prompt string
    """
    # Format context from retrieved chunks
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        chunk_type = chunk.get("type", "unknown")
        chunk_source = chunk.get("source", "unknown")
        chunk_content = chunk.get("content", "")
        
        context_parts.append(
            f"[Context {i} - Type: {chunk_type}, Source: {chunk_source}]\n{chunk_content}\n"
        )
    
    context_text = "\n".join(context_parts)
    
    prompt = f"""You are a helpful assistant that answers questions based ONLY on the provided context.

Context:
{context_text}

Question: {question}

Instructions:
- Answer the question using ONLY the information provided in the context above.
- If the answer cannot be found in the context, respond with: "I don't know based on the provided information."
- Be concise and accurate.
- If multiple sources are relevant, you can reference them.

Answer:"""
    
    return prompt
