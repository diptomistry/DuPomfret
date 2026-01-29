"""Vector database repository for Supabase pgvector operations."""
from typing import List, Dict, Any, Optional
from app.core.supabase import supabase


class VectorRepository:
    """Repository for vector operations on Supabase documents table."""
    
    @staticmethod
    def insert_documents(
        contents: List[str],
        embeddings: List[List[float]],
        metadata_list: List[Dict[str, Any]],
        types: List[str],
        sources: List[str],
        file_urls: Optional[List[Optional[str]]],
        namespace: str
    ) -> int:
        """
        Insert multiple documents with embeddings into the vector database.
        
        Args:
            contents: List of text chunks or image captions
            embeddings: List of embedding vectors (dimension depends on provider/schema)
            metadata_list: List of metadata dictionaries
            types: List of document types ('text', 'file', 'image')
            sources: List of source identifiers
            file_urls: List of file URLs (can be None for text)
            namespace: Namespace for dataset separation
            
        Returns:
            Number of documents inserted
        """
        if not contents or not embeddings:
            return 0
        
        # Prepare documents for insertion
        documents = []
        for i, (content, embedding, metadata, doc_type, source) in enumerate(
            zip(contents, embeddings, metadata_list, types, sources)
        ):
            file_url = file_urls[i] if file_urls and i < len(file_urls) else None
            
            doc = {
                "content": content,
                "embedding": embedding,
                "metadata": metadata,
                "type": doc_type,
                "source": source,
                "file_url": file_url,
                "namespace": namespace
            }
            documents.append(doc)
        
        # Insert in batches (Supabase has limits)
        batch_size = 100
        total_inserted = 0
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            result = supabase.table("documents").insert(batch).execute()
            total_inserted += len(result.data)
        
        return total_inserted
    
    @staticmethod
    def similarity_search(
        query_embedding: List[float],
        namespace: str,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search using cosine distance.
        
        Args:
            query_embedding: Query embedding vector (dimension depends on provider/schema)
            namespace: Namespace to search within
            top_k: Number of top results to return
            
        Returns:
            List of document dictionaries with content, metadata, type, source, file_url
        """
        # Try to use RPC function if available (more efficient)
        try:
            response = supabase.rpc(
                "match_documents",
                {
                    "query_embedding": query_embedding,
                    "match_namespace": namespace,
                    "match_count": top_k
                }
            ).execute()
            
            if response.data:
                results = []
                for doc in response.data:
                    results.append({
                        "similarity": doc.get("similarity", 0.0),
                        "content": doc["content"],
                        "metadata": doc["metadata"],
                        "type": doc["type"],
                        "source": doc["source"],
                        "file_url": doc.get("file_url"),
                        "user_id": doc["metadata"].get("user_id") if isinstance(doc["metadata"], dict) else None
                    })
                return results
        except Exception:
            # Fallback to manual calculation if RPC function doesn't exist
            pass
        
        # Fallback: Get documents and calculate similarity manually
        # This works but is less efficient for large datasets
        response = supabase.table("documents")\
            .select("*")\
            .eq("namespace", namespace)\
            .limit(1000)\
            .execute()
        
        if not response.data:
            return []
        
        # Calculate cosine similarity manually
        import ast
        import numpy as np
        
        # Ensure we have numeric vectors (Supabase/pg can sometimes return vectors as strings)
        if isinstance(query_embedding, str):
            query_list = ast.literal_eval(query_embedding)
        else:
            query_list = query_embedding
        query_vec = np.array(query_list, dtype=float)
        results = []
        
        for doc in response.data:
            emb = doc["embedding"]
            if isinstance(emb, str):
                emb = ast.literal_eval(emb)
            doc_embedding = np.array(emb, dtype=float)
            
            # Cosine similarity
            dot_product = np.dot(query_vec, doc_embedding)
            norm_query = np.linalg.norm(query_vec)
            norm_doc = np.linalg.norm(doc_embedding)
            
            if norm_query > 0 and norm_doc > 0:
                similarity = dot_product / (norm_query * norm_doc)
                results.append({
                    "similarity": similarity,
                    "content": doc["content"],
                    "metadata": doc["metadata"],
                    "type": doc["type"],
                    "source": doc["source"],
                    "file_url": doc.get("file_url"),
                    "user_id": doc["metadata"].get("user_id") if isinstance(doc["metadata"], dict) else None
                })
        
        # Sort by similarity and return top_k
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    @staticmethod
    def similarity_search_by_user(
        query_embedding: List[float],
        user_id: str,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Similarity search across ALL namespaces, restricted to a specific user.

        This does not use the RPC helper because the function is namespace-based.
        It instead filters by metadata->user_id in the documents table directly.
        """
        # Fetch a reasonable slice of this user's documents
        response = (
            supabase.table("documents")
            .select("*")
            .contains("metadata", {"user_id": user_id})
            .limit(1000)
            .execute()
        )

        if not response.data:
            return []

        # Calculate cosine similarity manually
        import ast
        import numpy as np

        # Ensure numeric vectors (handle stringified vectors)
        if isinstance(query_embedding, str):
            query_list = ast.literal_eval(query_embedding)
        else:
            query_list = query_embedding
        query_vec = np.array(query_list, dtype=float)
        results: List[Dict[str, Any]] = []

        for doc in response.data:
            emb = doc["embedding"]
            if isinstance(emb, str):
                emb = ast.literal_eval(emb)
            doc_embedding = np.array(emb, dtype=float)

            dot_product = np.dot(query_vec, doc_embedding)
            norm_query = np.linalg.norm(query_vec)
            norm_doc = np.linalg.norm(doc_embedding)

            if norm_query > 0 and norm_doc > 0:
                similarity = dot_product / (norm_query * norm_doc)
                results.append(
                    {
                        "similarity": similarity,
                        "content": doc["content"],
                        "metadata": doc["metadata"],
                        "type": doc["type"],
                        "source": doc["source"],
                        "file_url": doc.get("file_url"),
                        "user_id": doc["metadata"].get("user_id")
                        if isinstance(doc["metadata"], dict)
                        else None,
                    }
                )

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]
    
    @staticmethod
    def create_vector_search_function():
        """
        Helper method to document the SQL function needed for efficient vector search.
        This should be run in Supabase SQL editor for better performance.
        """
        sql = """
        CREATE OR REPLACE FUNCTION match_documents(
            query_embedding vector(768),
            match_namespace text,
            match_count int DEFAULT 4
        )
        RETURNS TABLE (
            id uuid,
            content text,
            metadata jsonb,
            type text,
            source text,
            file_url text,
            similarity float
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RETURN QUERY
            SELECT
                documents.id,
                documents.content,
                documents.metadata,
                documents.type,
                documents.source,
                documents.file_url,
                1 - (documents.embedding <=> query_embedding) as similarity
            FROM documents
            WHERE documents.namespace = match_namespace
            ORDER BY documents.embedding <=> query_embedding
            LIMIT match_count;
        END;
        $$;
        """
        return sql
