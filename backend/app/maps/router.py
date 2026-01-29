"""Google Maps API router (disabled).

All Maps-related API endpoints have been removed.
"""
from fastapi import APIRouter


router = APIRouter(prefix="/maps", tags=["maps"])
