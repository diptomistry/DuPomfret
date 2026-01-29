"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.admin.users_router import router as admin_users_router
from app.auth.router import router as auth_router
from app.ingest.router import router as ingest_router
from app.rag.router import router as rag_router
from app.search.router import router as search_router
from app.media.router import router as media_router
from app.storage.router import router as storage_router
from app.courses.router import router as courses_router
from app.materials.router import router as materials_router
from app.chat.router import router as chat_router


app = FastAPI(
    title="AI API Platform",
    description="AI API platform with RAG and unified ingestion",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_users_router)
app.include_router(ingest_router)
app.include_router(rag_router)
app.include_router(search_router)
app.include_router(media_router)
app.include_router(storage_router)
app.include_router(courses_router)
app.include_router(materials_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI API Platform",
        "version": "1.0.0",
        "endpoints": {
            "auth_login": "/auth/login",
            "auth_refresh": "/auth/refresh",
            "auth_me": "/auth/me",
            "admin_users": "/admin/users",
            "admin_user_role": "/admin/users/{user_id}/role",
            "admin_content_ingest": "/admin/content/ingest",
            "admin_courses": "/admin/courses",
            "courses": "/courses",
            "course_detail": "/courses/{course_id}",
            "course_contents": "/courses/{course_id}/contents",
            "course_search": "/courses/{course_id}/search",
            "course_image_search": "/courses/{course_id}/search/images",
            "course_media_generate": "/courses/{course_id}/media/generate",
            "course_generate_theory": "/courses/{course_id}/generate/theory",
            "course_generate_lab": "/courses/{course_id}/generate/lab",
            "material_validate": "/materials/{material_id}/validate",
            "chat_session": "/chat/session",
            "chat": "/chat/{session_id}",
            "handwritten_ingest": "/courses/{course_id}/handwritten/ingest",
            "storage": "/storage/upload"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
