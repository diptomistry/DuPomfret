"""Supabase client initialization."""
from supabase import create_client, Client
from app.core.config import settings


# Create Supabase client with service role key for admin operations
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)
