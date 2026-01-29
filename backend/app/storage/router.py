"""Storage upload API router (Cloudflare Images + R2)."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.auth import User, get_current_user
from app.storage.service import CloudflareUploadService
from fastapi import Query
from app.utils.file_download import download_file, extract_text_from_file, extract_pptx_slides
import os
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/storage", tags=["storage"])


class UploadResponse(BaseModel):
    url: str = Field(..., description="Public URL to the uploaded file")
    provider: str = Field(..., description="cloudflare_r2")
    key: str = Field(..., description="Cloudflare image id or R2 object key")
    file_type: str = Field(..., description="User-provided file_type (image/pdf/...)")
    content_type: str = Field(..., description="Detected/declared MIME type")
    size_bytes: int = Field(..., description="File size in bytes")


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(..., description="File to upload"),
    file_type: str = Form(..., description="Logical type, e.g. image, pdf"),
    folder: Optional[str] = Form(None, description="Optional folder prefix for R2 uploads"),
    current_user: User = Depends(get_current_user),
):
    """Upload a file to Cloudflare and return a public URL.

    All files are uploaded to Cloudflare R2 and returned as:
    `CLOUDFLARE_R2_PUBLIC_URL/<key>`
    """
    try:
        service = CloudflareUploadService()
        result = await service.upload(
            file=file,
            file_type=file_type,
            user_id=current_user.user_id,
            folder=folder,
        )
        return UploadResponse(
            url=result.url,
            provider=result.provider,
            key=result.key,
            file_type=file_type,
            content_type=result.content_type,
            size_bytes=result.size_bytes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )

@router.get("/fetch_text")
async def fetch_text(
    file_url: str = Query(..., description="Public or signed URL to fetch"),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch a file from storage and return extracted text or structured slides.
    Useful for previewing files (bypasses browser CORS issues by proxying).
    """
    try:
        # Validate simple URL
        if not file_url.startswith("http"):
            raise ValueError("Invalid URL")

        # Download raw bytes
        content = await download_file(file_url)
        path = file_url.split("?", 1)[0].split("#", 1)[0].lower()
        _, ext = os.path.splitext(path)
        if ext == ".pptx":
            slides = extract_pptx_slides(content)
            return JSONResponse({"type": "pptx", "slides": slides})

        # Fallback: use generic extractor which returns concatenated text
        text = await extract_text_from_file(file_url)
        return JSONResponse({"type": "text", "text": text})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

