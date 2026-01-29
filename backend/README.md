# AI API Platform

A hackathon-ready AI API platform built with FastAPI, Supabase, and OpenAI. Features Retrieval-Augmented Generation (RAG) and unified data ingestion for text, files, and images.

## Features

- **Authentication**: Supabase Auth with Google OAuth and email/password support
- **RAG**: Question answering with context retrieval from vector database
- **Unified Ingestion**: Ingest text, files (PDF, DOCX, TXT), and images
- **Vector Search**: Efficient similarity search using Supabase pgvector

## Tech Stack

- **Language**: Python 3.11
- **Framework**: FastAPI
- **Auth**: Supabase Auth (JWT validation)
- **Vector DB**: Supabase Postgres with pgvector
- **Embeddings**: Replicate CLIP (text + image)
- **LLM**: OpenAI Chat Completion (gpt-4o-mini)
- **Storage**: Cloudflare (for file/image URLs)
- **Maps**: Google Maps API (Places, Directions, Static Maps)
- **Media Generation**: Replicate API (text-to-image, image-to-image, image-editing, text-to-video, image-to-video)

## Prerequisites

- Python 3.11+
- Docker and Docker Compose (optional)
- Supabase account and project
- OpenAI API key
- Google OAuth credentials (for OAuth setup)
- Replicate API token (for media generation + optional embeddings)

## Setup

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `sql/schema.sql`
3. Get your project credentials:
   - **Project URL**: Found in Project Settings → API
   - **Service Role Key**: Found in Project Settings → API (keep this secret!)
   - **JWT Secret**: Found in Project Settings → API → JWT Settings

### 2. Google OAuth Setup (Supabase)

Supabase handles Google OAuth automatically. To enable it:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Google** provider
3. You'll need:
   - **Google Client ID**: From [Google Cloud Console](https://console.cloud.google.com)
   - **Google Client Secret**: From Google Cloud Console
4. In Google Cloud Console:
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
5. Enter the credentials in Supabase

**Note**: The backend API does NOT implement login/register endpoints. Users authenticate through Supabase Auth (web/mobile SDK), and the API validates JWT tokens from the `Authorization: Bearer <token>` header.

### 3. Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Directions API
   - Maps Static API
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key
6. (Optional) Restrict the API key to specific APIs for security

### 4. Replicate API Setup

1. Go to [Replicate](https://replicate.com) and create an account
2. Go to **Account Settings** → **API Tokens**
3. Create a new API token
4. Copy your API token
5. The API uses these default models:
   - **Images**: `google/nano-banana` (for text-to-image, image-to-image, image-editing)
   - **Videos**: `google/veo-2` (for text-to-video, image-to-video)
6. You can override the model by passing `model` parameter in the request

### 5. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-your-openai-api-key
CLOUD_FLARE_API_KEY=your-cloudflare-api-key  # Optional
CLOUD_FLARE_ACCOUNT_ID=your-cloudflare-account-id  # Optional
GOOGLE_CLIENT_ID=your-google-client-id  # For documentation
GOOGLE_CLIENT_SECRET=your-google-client-secret  # For documentation
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REPLICATE_API_TOKEN=your-replicate-api-token
```

### 6. Install Dependencies

```bash
pip install -r requirements.txt
```

### 7. Run Locally

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### 8. Run with Docker

```bash
docker-compose up --build
```

## API Endpoints

### Authentication

All endpoints (except `/`, `/health`, and `/maps/*`) require authentication via Bearer token:

```
Authorization: Bearer <supabase-jwt-token>
```

To get a token:
1. Use Supabase Auth SDK in your frontend/mobile app
2. After login (email/password or Google OAuth), Supabase returns a JWT
3. Include this JWT in the `Authorization` header

### Ingest Content

**POST** `/ingest`

Ingest text, files, or images into the vector database.

**Request Body:**
```json
{
  "type": "text",  // "text" | "file" | "image"
  "content": "Optional text content (required for type=text)",
  "url": "Optional URL (required for type=file or type=image)",
  "source": "facebook_post",  // e.g., "facebook_post", "tour_pdf", "trip_image"
  "namespace": "saint_martin_demo"
}
```

**Response:**
```json
{
  "message": "Ingested successfully",
  "chunks": 5
}
```

**Example - Text:**
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "Saint Martin trip costs 12,000 BDT for 3 days including accommodation and meals.",
    "source": "facebook_post",
    "namespace": "saint_martin_demo"
  }'
```

**Example - File:**
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "file",
    "url": "https://example.com/tour-guide.pdf",
    "source": "tour_pdf",
    "namespace": "saint_martin_demo"
  }'
```

**Example - Image:**
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "url": "https://example.com/trip-photo.jpg",
    "content": "Beautiful beach view from Saint Martin",
    "source": "trip_image",
    "namespace": "saint_martin_demo"
  }'
```

### RAG Query

**POST** `/rag/query`

Answer questions using retrieved context from the vector database.

**Request Body:**
```json
{
  "question": "How much does Saint Martin trip cost?",
  "namespace": "saint_martin_demo"
}
```

**Response:**
```json
{
  "answer": "12,000 BDT for 3 days",
  "sources": [
    {
      "content": "Saint Martin trip costs 12,000 BDT for 3 days including accommodation and meals.",
      "metadata": {
        "type": "text",
        "source": "facebook_post",
        "url": null,
        "user_id": "user-uuid"
      }
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How much does Saint Martin trip cost?",
    "namespace": "saint_martin_demo"
  }'
```

### Google Maps API

**Note**: Maps endpoints do NOT require authentication (public endpoints).

#### 1. Autocomplete

**GET** `/maps/autocomplete?input=<query>`

Get place autocomplete predictions.

**Query Parameters:**
- `input` (required): Search query string

**Response:**
```json
[
  {
    "place_id": "ChIJ...",
    "name": "Saint Martin Island, Bangladesh",
    "address": "Saint Martin Island, Bangladesh",
    "lat": 20.6142,
    "lng": 92.3234
  }
]
```

**Example:**
```bash
curl "http://localhost:8000/maps/autocomplete?input=saint%20martin"
```

#### 2. Place Details

**GET** `/maps/place?place_id=<place_id>`

Get detailed information about a place.

**Query Parameters:**
- `place_id` (required): Google Place ID

**Response:**
```json
{
  "name": "Saint Martin Island",
  "address": "Saint Martin Island, Bangladesh",
  "lat": 20.6142,
  "lng": 92.3234,
  "rating": 4.5,
  "types": ["tourist_attraction", "point_of_interest"],
  "photos": [
    {
      "photo_reference": "Aap_uEA...",
      "width": 4000,
      "height": 3000
    }
  ],
  "opening_hours": [],
  "website": "https://...",
  "phone_number": "+880..."
}
```

**Example:**
```bash
curl "http://localhost:8000/maps/place?place_id=ChIJ..."
```

#### 3. Directions

**GET** `/maps/directions?origin=<lat,lng>&destination=<lat,lng>&mode=<mode>`

Get directions between two points.

**Query Parameters:**
- `origin` (required): Origin coordinates as "lat,lng"
- `destination` (required): Destination coordinates as "lat,lng"
- `mode` (optional): Travel mode - `driving`, `walking`, `transit`, or `bicycling` (default: `driving`)

**Response:**
```json
{
  "distance": "245 km",
  "distance_meters": 245000,
  "duration": "5 hours 30 mins",
  "duration_seconds": 19800,
  "polyline": "encoded_polyline_string",
  "steps": [
    {
      "instruction": "Head <b>north</b> on Main St",
      "distance": "0.5 km",
      "duration": "2 mins"
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:8000/maps/directions?origin=23.8103,90.4125&destination=20.6142,92.3234&mode=driving"
```

#### 4. Static Map

**GET** `/maps/static?lat=<lat>&lng=<lng>&zoom=<zoom>&markers=<markers>`

Generate static map image URL.

**Query Parameters:**
- `lat` (required): Center latitude
- `lng` (required): Center longitude
- `zoom` (optional): Zoom level 1-20 (default: 15)
- `markers` (optional): Comma-separated markers as "lat,lng|lat,lng"

**Response:**
```json
{
  "url": "https://maps.googleapis.com/maps/api/staticmap?center=20.6142,92.3234&zoom=15&size=600x400&key=..."
}
```

**Example:**
```bash
curl "http://localhost:8000/maps/static?lat=20.6142&lng=92.3234&zoom=15&markers=20.6142,92.3234"
```

#### 5. Nearby Search

**GET** `/maps/nearby?lat=<lat>&lng=<lng>&type=<type>&radius=<meters>`

Search for nearby places.

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `type` (required): Place type (e.g., `restaurant`, `hotel`, `cafe`, `tourist_attraction`)
- `radius` (optional): Search radius in meters, max 50000 (default: 1000)

**Response:**
```json
[
  {
    "place_id": "ChIJ...",
    "name": "Beach Resort",
    "address": "Saint Martin Island",
    "lat": 20.6142,
    "lng": 92.3234,
    "rating": 4.2,
    "types": ["lodging", "point_of_interest"],
    "price_level": 2
  }
]
```

**Example:**
```bash
curl "http://localhost:8000/maps/nearby?lat=20.6142&lng=92.3234&type=hotel&radius=5000"
```

### Media Generation API

**Note**: Media generation endpoints require authentication via Bearer token.

#### Generate Media

**POST** `/media/generate`

Generate images or videos using AI (powered by Replicate).

**Request Body:**
```json
{
  "type": "text-to-image",  // "text-to-image" | "image-to-image" | "image-editing" | "text-to-video" | "image-to-video"
  "prompt": "a dog riding a skateboard",
  "image_urls": ["https://example.com/image.jpg"],  // Required for image-to-image, image-editing, image-to-video
  "model": "google/nano-banana"  // Optional: override default model
}
```

**Response:**
```json
{
  "type": "text-to-image",
  "url": "https://replicate.delivery/.../output.jpg",
  "prompt": "a dog riding a skateboard",
  "input_images": null
}
```

**Supported Types:**

1. **text-to-image**: Generate image from text prompt
   ```json
   {
     "type": "text-to-image",
     "prompt": "a beautiful sunset over mountains"
   }
   ```

2. **image-to-image**: Generate image from text prompt and input images
   ```json
   {
     "type": "image-to-image",
     "prompt": "Make the sheets in the style of the logo. Make the scene natural.",
     "image_urls": ["https://example.com/image1.png", "https://example.com/image2.png"]
   }
   ```

3. **image-editing**: Edit images based on text prompt
   ```json
   {
     "type": "image-editing",
     "prompt": "Add a rainbow in the sky",
     "image_urls": ["https://example.com/image.jpg"]
   }
   ```

4. **text-to-video**: Generate video from text prompt
   ```json
   {
     "type": "text-to-video",
     "prompt": "a dog riding a skateboard"
   }
   ```

5. **image-to-video**: Generate video from text prompt and input images
   ```json
   {
     "type": "image-to-video",
     "prompt": "Animate this scene with gentle movement",
     "image_urls": ["https://example.com/image.jpg"]
   }
   ```

**Example - Text to Image:**
```bash
curl -X POST http://localhost:8000/media/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text-to-image",
    "prompt": "a beautiful sunset over mountains"
  }'
```

**Example - Image to Image:**
```bash
curl -X POST http://localhost:8000/media/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image-to-image",
    "prompt": "Make the sheets in the style of the logo. Make the scene natural.",
    "image_urls": [
      "https://replicate.delivery/pbxt/NbYIclp4A5HWLsJ8lF5KgiYSNaLBBT1jUcYcHYQmN1uy5OnN/tmpcqc07f_q.png",
      "https://replicate.delivery/pbxt/NbYId45yH8s04sptdtPcGqFIhV7zS5GTcdS3TtNliyTAoYPO/Screenshot%202025-08-26%20at%205.30.12%E2%80%AFPM.png"
    ]
  }'
```

**Example - Text to Video:**
```bash
curl -X POST http://localhost:8000/media/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text-to-video",
    "prompt": "a dog riding a skateboard"
  }'
```

## Project Structure

```
.
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   ├── config.py           # Configuration management
│   │   ├── supabase.py         # Supabase client
│   │   ├── auth.py             # JWT validation
│   ├── ingest/
│   │   ├── router.py           # Ingestion endpoints
│   │   ├── service.py          # Ingestion logic
│   ├── rag/
│   │   ├── router.py           # RAG endpoints
│   │   ├── service.py          # RAG logic
│   │   ├── prompts.py          # Prompt templates
│   ├── maps/
│   │   ├── router.py           # Google Maps endpoints
│   │   ├── service.py          # Google Maps API logic
│   ├── media/
│   │   ├── router.py           # Media generation endpoints
│   │   ├── service.py          # Replicate API logic
│   ├── vectorstore/
│   │   ├── repository.py       # Vector DB operations
│   └── utils/
│       ├── chunking.py         # Text chunking
│       ├── embeddings.py       # Replicate CLIP embeddings
│       └── file_download.py    # File download/extraction
├── sql/
│   └── schema.sql              # Database schema
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## Notes for Hackathon Judges

### Architecture Highlights

1. **Clean Separation**: Modular structure with clear separation of concerns
2. **Authentication**: Secure JWT validation using Supabase Auth
3. **Unified Ingestion**: Single endpoint handles text, files, and images
4. **Efficient Vector Search**: Uses pgvector with IVFFlat indexing
5. **Production-Ready**: Error handling, validation, and Docker support

### Key Features

- **Multi-modal Support**: Handles text, PDF/DOCX files, and images
- **Namespace Isolation**: Separate datasets using namespaces
- **User Isolation**: Metadata includes user_id for multi-tenant support
- **Grounded Answers**: RAG ensures answers are based on provided context
- **Source Attribution**: Returns sources for transparency

### Performance Optimizations

- Batch embedding generation for multiple chunks
- Vector search uses efficient cosine similarity
- Optional SQL function for faster vector search (see `sql/schema.sql`)
- Chunking with overlap for better context preservation

### Security

- JWT validation on all protected endpoints
- Service role key used only for backend operations
- User ID extracted from JWT and stored in metadata
- Input validation and error handling

## Development

### Running Tests

```bash
# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests (if you add them)
pytest
```

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

### Vector Search Performance

If vector search is slow, ensure you've run the `match_documents` function from `sql/schema.sql` in your Supabase SQL editor. This creates an optimized RPC function for similarity search.

### Authentication Issues

- Verify your `SUPABASE_JWT_SECRET` matches the JWT secret in Supabase dashboard
- Ensure tokens are not expired
- Check that the token includes `sub` (user_id) claim

### File Extraction Issues

- Supported formats: PDF, DOCX, TXT
- Ensure file URLs are publicly accessible
- Check file size limits (default timeout is 30 seconds)

## License

MIT
