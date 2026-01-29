"""Cloudflare R2 upload service.

All files (images, PDFs, videos, etc.) are uploaded to a single
Cloudflare R2 bucket using the S3-compatible API. The service returns
the public URL based on your configured R2 public domain.
"""

from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass
from typing import Optional, Tuple
from uuid import uuid4

import boto3
from fastapi import UploadFile

from app.core.config import settings


@dataclass
class UploadResult:
    provider: str
    url: str
    key: str
    content_type: str
    size_bytes: int


class CloudflareUploadService:
    """Upload files to Cloudflare R2 only."""

    def __init__(self) -> None:
        self.r2_access_key_id = settings.cloudflare_r2_access_key_id
        self.r2_secret_access_key = settings.cloudflare_r2_secret_access_key
        self.r2_bucket = settings.cloudflare_r2_bucket
        self.r2_endpoint = settings.cloudflare_r2_endpoint
        self.r2_public_base_url = settings.cloudflare_r2_public_base_url

    @staticmethod
    def _sniff_content_type(filename: str, fallback: str = "application/octet-stream") -> str:
        guessed, _ = mimetypes.guess_type(filename)
        return guessed or fallback

    @staticmethod
    def _build_object_key(user_id: str, filename: str, folder: Optional[str]) -> str:
        safe_name = os.path.basename(filename or "upload.bin")
        unique = uuid4().hex
        prefix = folder.strip("/").strip() if folder else "uploads"
        return f"{prefix}/{user_id}/{unique}_{safe_name}"

    async def upload(
        self,
        *,
        file: UploadFile,
        file_type: str,
        user_id: str,
        folder: Optional[str] = None,
    ) -> UploadResult:
        """Upload file to Cloudflare R2 (file_type is accepted but not used for routing)."""
        return await self._upload_to_r2(file=file, user_id=user_id, folder=folder)

    async def _upload_to_r2(self, *, file: UploadFile, user_id: str, folder: Optional[str]) -> UploadResult:
        if not (
            self.r2_access_key_id
            and self.r2_secret_access_key
            and self.r2_bucket
            and self.r2_endpoint
            and self.r2_public_base_url
        ):
            raise ValueError(
                "R2 upload requires CLOUD_FLARE_R2_ACCESS_KEY_ID, CLOUD_FLARE_R2_SECRET_ACCESS_KEY, "
                "CLOUD_FLARE_R2_BUCKET, CLOUD_FLARE_R2_ENDPOINT, CLOUD_FLARE_R2_PUBLIC_BASE_URL"
            )

        object_key = self._build_object_key(user_id=user_id, filename=file.filename or "upload", folder=folder)
        content_type = file.content_type or self._sniff_content_type(file.filename or "file")

        # Read content (hackathon-friendly; for huge files you'd stream)
        content = await file.read()
        size_bytes = len(content)

        s3 = boto3.client(
            "s3",
            endpoint_url=self.r2_endpoint,
            aws_access_key_id=self.r2_access_key_id,
            aws_secret_access_key=self.r2_secret_access_key,
            region_name="auto",
        )

        # Upload object. R2 doesn't support ACLs; make bucket public via custom domain / public bucket settings.
        s3.put_object(
            Bucket=self.r2_bucket,
            Key=object_key,
            Body=content,
            ContentType=content_type,
        )

        public_base = self.r2_public_base_url.rstrip("/")
        url = f"{public_base}/{object_key}"

        return UploadResult(
            provider="cloudflare_r2",
            url=url,
            key=object_key,
            content_type=content_type,
            size_bytes=size_bytes,
        )

