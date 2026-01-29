"""Admin debug endpoints to inspect documents and namespaces."""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel

from app.core.auth import require_admin, User
from app.core.supabase import supabase
from app.utils.embeddings_safe import get_text_embedding_retry
from app.utils.embeddings import embedding_dimension


router = APIRouter(prefix="/admin/debug", tags=["admin-debug"])


class DocumentRow(BaseModel):
    id: str
    content: str | None
    metadata: Dict[str, Any] | None
    type: str | None
    source: str | None
    file_url: str | None


class DocumentsDebugResponse(BaseModel):
    namespace: str
    count: int
    sample: list[DocumentRow]


@router.get("/documents/{namespace}", response_model=DocumentsDebugResponse)
async def debug_documents(
    namespace: str = Path(..., description="Namespace / course_id to inspect"),
    current_user: User = Depends(require_admin),
):
    """Return document count and a small sample for a namespace (admin only)."""
    _ = current_user
    try:
        # Count documents (exact count)
        resp_count = (
            supabase.table("documents").select("id", count="exact").eq("namespace", namespace).execute()
        )
        total = 0
        if resp_count and resp_count.count is not None:
            total = int(resp_count.count)

        # Fetch a small sample
        resp_sample = (
            supabase.table("documents")
            .select("id, content, metadata, type, source, file_url")
            .eq("namespace", namespace)
            .limit(20)
            .execute()
        )
        rows = resp_sample.data or []
        sample = []
        for r in rows:
            sample.append(
                DocumentRow(
                    id=str(r.get("id")),
                    content=r.get("content"),
                    metadata=r.get("metadata"),
                    type=r.get("type"),
                    source=r.get("source"),
                    file_url=r.get("file_url"),
                )
            )

        return DocumentsDebugResponse(namespace=namespace, count=total, sample=sample)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query documents: {str(e)}",
        )


class EmbeddingStatsResponse(BaseModel):
    namespace: str
    total_docs: int
    docs_with_embedding: int
    zero_embedding_count: int
    avg_norm: float | None
    sample_norms: list[float]


@router.get("/embeddings/{namespace}", response_model=EmbeddingStatsResponse)
async def debug_embedding_stats(
    namespace: str = Path(..., description="Namespace / course_id to inspect"),
    current_user: User = Depends(require_admin),
):
    """Return simple stats about embeddings in a namespace (count, zeros, avg norm)."""
    _ = current_user
    try:
        resp = (
            supabase.table("documents")
            .select("id, embedding")
            .eq("namespace", namespace)
            .limit(1000)
            .execute()
        )
        rows = resp.data or []

        import ast
        import math
        import numpy as np

        total = len(rows)
        with_emb = 0
        zero_count = 0
        norms = []
        sample_norms = []

        for r in rows:
            emb = r.get("embedding")
            if emb is None:
                continue
            with_emb += 1
            try:
                if isinstance(emb, str):
                    emb_list = ast.literal_eval(emb)
                else:
                    emb_list = emb
                vec = np.array(emb_list, dtype=float)
                norm = float(np.linalg.norm(vec))
            except Exception:
                # treat as missing
                continue

            norms.append(norm)
            if norm == 0.0 or not math.isfinite(norm):
                zero_count += 1
            if len(sample_norms) < 10:
                sample_norms.append(norm)

        avg = float(np.mean(norms)) if norms else None

        return EmbeddingStatsResponse(
            namespace=namespace,
            total_docs=total,
            docs_with_embedding=with_emb,
            zero_embedding_count=zero_count,
            avg_norm=avg,
            sample_norms=sample_norms,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute embedding stats: {str(e)}",
        )


class ReembedResponse(BaseModel):
    namespace: str
    reembedded: int
    failed: int
    details: list[dict]


@router.post("/reembed/{namespace}", response_model=ReembedResponse)
async def reembed_namespace(
    namespace: str = Path(..., description="Namespace / course_id to re-embed"),
    current_user: User = Depends(require_admin),
):
    """
    Recompute embeddings for documents in a namespace that have zero or missing embeddings.
    Uses the safe retrying embedding helper; updates documents.embedding column.
    """
    _ = current_user
    try:
        resp = (
            supabase.table("documents")
            .select("id, content, type")
            .eq("namespace", namespace)
            .limit(1000)
            .execute()
        )
        rows = resp.data or []
        reembedded = 0
        failed = 0
        details: list[dict] = []
        expected_dim = embedding_dimension()

        import ast
        import numpy as np

        for r in rows:
            doc_id = r.get("id")
            doc_type = r.get("type")
            content = r.get("content") or ""

            # Skip images — they require image embedding workflow
            if doc_type == "image":
                continue

            # Fetch current embedding to check if zero (we rely on earlier stats; re-check)
            # For simplicity, attempt to compute new embedding for all non-image docs
            try:
                vec = get_text_embedding_retry(content)
                # ensure dimension
                if not isinstance(vec, list) or len(vec) != expected_dim:
                    raise ValueError("Invalid embedding dimension")
                # Update document embedding
                update_resp = supabase.table("documents").update({"embedding": vec}).eq("id", doc_id).execute()
                # supabase returns data on success
                if update_resp.error:
                    failed += 1
                    details.append({"id": doc_id, "error": str(update_resp.error)})
                else:
                    reembedded += 1
                    details.append({"id": doc_id, "status": "ok"})
            except Exception as e:
                failed += 1
                details.append({"id": doc_id, "error": str(e)})

        return ReembedResponse(namespace=namespace, reembedded=reembedded, failed=failed, details=details)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to re-embed namespace: {str(e)}",
        )

