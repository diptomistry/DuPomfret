"""Google Maps API service."""
import httpx
from urllib.parse import quote
from typing import List, Dict, Any, Optional
from app.core.config import settings


class GoogleMapsService:
    """Service for Google Maps API operations."""
    
    BASE_URL = "https://maps.googleapis.com/maps/api"
    # New Places API (v1) - fixes INVALID_REQUEST when place_id comes from Autocomplete
    PLACES_V1_BASE = "https://places.googleapis.com/v1/places"
    
    def __init__(self):
        self.api_key = settings.google_maps_api_key
        if not self.api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY is required")
    
    async def autocomplete(self, query: str) -> List[Dict[str, Any]]:
        """
        Get place autocomplete predictions.
        
        Args:
            query: Search query string
            
        Returns:
            List of place predictions with place_id, name, address, lat/lng
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/place/autocomplete/json",
                params={
                    "input": query,
                    "key": self.api_key
                }
            )
            response.raise_for_status()
            data = response.json()
            
            status_code = data.get("status")
            if status_code not in ["OK", "ZERO_RESULTS"]:
                raise ValueError(f"Google Maps API error: {status_code}")
            
            if status_code == "ZERO_RESULTS":
                return []
            
            predictions = []
            for prediction in data.get("predictions", []):
                place_id = prediction.get("place_id")
                if place_id:
                    try:
                        place_details = await self._get_place_details_internal(place_id)
                        predictions.append({
                            "place_id": place_id,
                            "name": prediction.get("description", ""),
                            "address": prediction.get("description", ""),
                            "lat": place_details.get("lat"),
                            "lng": place_details.get("lng")
                        })
                    except Exception:
                        predictions.append({
                            "place_id": place_id,
                            "name": prediction.get("description", ""),
                            "address": prediction.get("description", ""),
                            "lat": None,
                            "lng": None
                        })
            
            return predictions
    
    def _parse_places_v1_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse New Place Details (v1) response into our standard shape."""
        loc = data.get("location") or {}
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        
        display = data.get("displayName") or {}
        name = display.get("text", "") if isinstance(display, dict) else str(display or "")
        
        photos_out = []
        for p in data.get("photos", []):
            photos_out.append({
                "photo_reference": p.get("name"),  # v1 uses name as resource
                "width": p.get("widthPx"),
                "height": p.get("heightPx")
            })
        
        hours = data.get("regularOpeningHours", {}) or {}
        weekday_text = hours.get("weekdayDescriptions", []) if isinstance(hours, dict) else []
        
        return {
            "name": name,
            "address": data.get("formattedAddress") or "",
            "lat": lat,
            "lng": lng,
            "rating": data.get("rating"),
            "types": data.get("types", []),
            "photos": photos_out,
            "opening_hours": weekday_text,
            "website": data.get("websiteUri"),
            "phone_number": data.get("nationalPhoneNumber")
        }
    
    async def _get_place_details_v1(self, place_id: str) -> Dict[str, Any]:
        """Fetch Place Details using New Places API (v1). Avoids INVALID_REQUEST."""
        # Strip "places/" prefix if caller sent full resource name
        pid = (place_id or "").strip()
        if pid.startswith("places/"):
            pid = pid[7:]
        if not pid:
            raise ValueError("place_id is required")
        
        url = f"{self.PLACES_V1_BASE}/{quote(pid, safe='')}"
        field_mask = (
            "id,displayName,formattedAddress,location,rating,types,photos,"
            "regularOpeningHours.weekdayDescriptions,websiteUri,nationalPhoneNumber"
        )
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": field_mask,
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        
        return self._parse_places_v1_response(data)
    
    async def _get_place_details_internal(self, place_id: str) -> Dict[str, Any]:
        """Internal method to get place details (used by autocomplete). Uses New API."""
        try:
            return await self._get_place_details_v1(place_id)
        except Exception:
            return {}
    
    async def get_place_details(self, place_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a place.
        Uses Place Details (New) API to avoid INVALID_REQUEST with Autocomplete place_ids.
        
        Args:
            place_id: Google Place ID (e.g. from /maps/autocomplete)
            
        Returns:
            Structured place info (name, address, lat/lng, rating, types, photos)
        """
        result = await self._get_place_details_v1(place_id)
        if not result.get("name") and not result.get("address"):
            raise ValueError("Google Maps API error: INVALID_REQUEST or place not found")
        return result
    
    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """
        Get directions between two points.
        
        Args:
            origin: Origin coordinates as "lat,lng"
            destination: Destination coordinates as "lat,lng"
            mode: Travel mode (driving, walking, transit, bicycling)
            
        Returns:
            Route info (distance, duration, polyline for map)
        """
        valid_modes = ["driving", "walking", "transit", "bicycling"]
        if mode not in valid_modes:
            raise ValueError(f"Invalid mode. Must be one of: {valid_modes}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/directions/json",
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "key": self.api_key
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                raise ValueError(f"Google Maps API error: {data.get('status')}")
            
            routes = data.get("routes", [])
            if not routes:
                return {
                    "distance": None,
                    "duration": None,
                    "polyline": None
                }
            
            route = routes[0]
            leg = route.get("legs", [{}])[0]
            
            distance = leg.get("distance", {}).get("text", "")
            duration = leg.get("duration", {}).get("text", "")
            polyline = route.get("overview_polyline", {}).get("points", "")
            
            return {
                "distance": distance,
                "distance_meters": leg.get("distance", {}).get("value"),
                "duration": duration,
                "duration_seconds": leg.get("duration", {}).get("value"),
                "polyline": polyline,
                "steps": [
                    {
                        "instruction": step.get("html_instructions", ""),
                        "distance": step.get("distance", {}).get("text", ""),
                        "duration": step.get("duration", {}).get("text", "")
                    }
                    for step in leg.get("steps", [])
                ]
            }
    
    def get_static_map_url(
        self,
        lat: float,
        lng: float,
        zoom: int = 15,
        markers: Optional[List[str]] = None,
        size: str = "600x400"
    ) -> str:
        """
        Generate static map image URL.
        
        Args:
            lat: Center latitude
            lng: Center longitude
            zoom: Zoom level (1-20)
            markers: Optional list of marker coordinates as "lat,lng"
            size: Map size (default: 600x400)
            
        Returns:
            URL to static map image
        """
        params = {
            "center": f"{lat},{lng}",
            "zoom": zoom,
            "size": size,
            "key": self.api_key
        }
        
        if markers:
            markers_str = "|".join(markers)
            params["markers"] = markers_str
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.BASE_URL}/staticmap?{query_string}"
    
    async def nearby_search(
        self,
        lat: float,
        lng: float,
        type: str,
        radius: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Search for nearby places.
        
        Args:
            lat: Latitude
            lng: Longitude
            type: Place type (restaurant, hotel, cafe, etc.)
            radius: Search radius in meters (max 50000)
            
        Returns:
            List of nearby places with details
        """
        if radius > 50000:
            radius = 50000
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/place/nearbysearch/json",
                params={
                    "location": f"{lat},{lng}",
                    "type": type,
                    "radius": radius,
                    "key": self.api_key
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") != "OK":
                raise ValueError(f"Google Maps API error: {data.get('status')}")
            
            places = []
            for result in data.get("results", []):
                location = result.get("geometry", {}).get("location", {})
                places.append({
                    "place_id": result.get("place_id"),
                    "name": result.get("name"),
                    "address": result.get("vicinity", ""),
                    "lat": location.get("lat"),
                    "lng": location.get("lng"),
                    "rating": result.get("rating"),
                    "types": result.get("types", []),
                    "price_level": result.get("price_level")
                })
            
            return places
