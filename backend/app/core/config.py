"""Configuration management for the application."""
import os
from typing import Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    # Optional: use for auth helper APIs (login/refresh). If unset, service_role_key is used.
    supabase_anon_key: Optional[str] = None
    
    # OpenAI
    openai_api_key: str
    
    # Embeddings (Replicate CLIP)
    # Example model from user message:
    # krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4
    replicate_clip_embeddings_model: str = (
        "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4"
    )
    
    # Cloudflare (optional - for direct backend calls)
    cloudflare_api_key: Optional[str] = None
    cloudflare_account_id: Optional[str] = None

    # Cloudflare R2 (optional, required for non-image uploads)
    # Support both naming conventions:
    # - CLOUD_FLARE_R2_* (recommended)
    # - CLOUDFLARE_R2_* (common)
    cloudflare_r2_access_key_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("CLOUD_FLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID"),
    )
    cloudflare_r2_secret_access_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("CLOUD_FLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    )
    cloudflare_r2_bucket: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("CLOUD_FLARE_R2_BUCKET", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_BUCKET_NAME"),
    )
    cloudflare_r2_endpoint: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("CLOUD_FLARE_R2_ENDPOINT", "CLOUDFLARE_R2_ENDPOINT"),
    )
    cloudflare_r2_public_base_url: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "CLOUD_FLARE_R2_PUBLIC_BASE_URL", "CLOUDFLARE_R2_PUBLIC_BASE_URL", "CLOUDFLARE_R2_PUBLIC_URL"
        ),
    )
    
    # Google OAuth (for documentation)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # Google Maps API (optional / currently unused)
    # Made optional so the backend does not require this key when
    # no Maps functionality is in use.
    google_maps_api_key: Optional[str] = None
    
    # Replicate API
    replicate_api_token: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
