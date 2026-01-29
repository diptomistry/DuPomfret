"""Ingestion service for course content and RAG documents."""

from typing import Any, Dict, List, Optional

from app.core.supabase import supabase
from app.utils.chunking import chunk_text
from app.utils.embeddings import get_text_embeddings_batch, get_image_embedding
from app.utils.file_download import extract_text_from_file
from app.vectorstore.repository import VectorRepository


class IngestionService:
    """Service for ingesting course content into course_contents + documents."""

    def __init__(self):
        self.vector_repo = VectorRepository()

    async def ingest_course_content(
        self,
        course_id: str,
        category: str,
        content_type: str,
        file_url: str,
        title: Optional[str] = None,
        week: Optional[int] = None,
        topic: Optional[str] = None,
        tags: Optional[List[str]] = None,
        language: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Ingest a single course content file.

        Steps:
        1. Insert a row into `course_contents`
        2. Download + extract text
        3. Chunk + embed and insert into `documents` with namespace = course_id
        """
        if category not in ("theory", "lab"):
            raise ValueError("category must be 'theory' or 'lab'")

        if content_type not in ("slide", "pdf", "code", "note", "image"):
            raise ValueError(
                "content_type must be one of: 'slide', 'pdf', 'code', 'note', 'image'"
            )

        tags = tags or []
        # 1) Insert CMS row
        display_title = title or topic or "Course content"
        resp = (
            supabase.table("course_contents")
            .insert(
                {
                    "course_id": course_id,
                    "category": category,
                    "title": display_title,
                    "week": week,
                    "topic": topic,
                    "tags": tags,
                    "content_type": content_type,
                    "file_url": file_url,
                    "language": language,
                    "created_by": created_by,
                }
            )
            .execute()
        )

        if not resp.data:
            raise ValueError("Failed to insert course content row")

        content_id = resp.data[0]["id"]

        # 2) Handle images vs text-based content differently
        if content_type == "image":
            # For images: generate CLIP image embedding directly
            embedding = get_image_embedding(file_url)
            
            metadata = {
                "course_id": course_id,
                "content_id": str(content_id),
                "category": category,
                "week": week,
                "topic": topic,
                "language": language,
                "content_type": content_type,
                "chunk_index": 0,
                "total_chunks": 1,
                "file_url": file_url,
                "created_by": created_by,
            }
            
            inserted = self.vector_repo.insert_documents(
                contents=[""],  # Empty content for images
                embeddings=[embedding],
                metadata_list=[metadata],
                types=["image"],  # Important: type must be "image" for image search
                sources=[content_type],
                file_urls=[file_url],
                namespace=course_id,
            )
        else:
            # For text-based content: extract text, chunk, and embed
            text = await extract_text_from_file(file_url)
            
            chunks = chunk_text(text, chunk_size=1000, overlap=200)
            if not chunks:
                return {"chunks": 0, "content_id": str(content_id)}

            embeddings = get_text_embeddings_batch(chunks)

            metadata_list: List[Dict[str, Any]] = []
            total = len(chunks)
            for i in range(total):
                metadata_list.append(
                    {
                        "course_id": course_id,
                        "content_id": str(content_id),
                        "category": category,
                        "week": week,
                        "topic": topic,
                        "language": language,
                        "content_type": content_type,
                        "chunk_index": i,
                        "total_chunks": total,
                        "file_url": file_url,
                        "created_by": created_by,
                    }
                )

            types = ["file"] * total
            sources = [content_type] * total
            file_urls = [file_url] * total

            inserted = self.vector_repo.insert_documents(
                contents=chunks,
                embeddings=embeddings,
                metadata_list=metadata_list,
                types=types,
                sources=sources,
                file_urls=file_urls,
                namespace=course_id,
            )

        return {"chunks": inserted, "content_id": str(content_id)}
