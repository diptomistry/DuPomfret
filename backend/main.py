"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.ingest.router import router as ingest_router
from app.rag.router import router as rag_router
from app.search.router import router as search_router
from app.maps.router import router as maps_router
from app.media.router import router as media_router
from app.storage.router import router as storage_router


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
app.include_router(ingest_router)
app.include_router(rag_router)
app.include_router(search_router)
app.include_router(maps_router)
app.include_router(media_router)
app.include_router(storage_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI API Platform",
        "version": "1.0.0",
        "endpoints": {
            "ingest": "/ingest",
            "rag": "/rag/query",
            "search_images": "/search/images",
            "maps": "/maps",
            "media": "/media/generate",
            "storage": "/storage/upload"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
