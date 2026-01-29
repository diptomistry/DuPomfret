# Backend API Reference

Base URL: `http://localhost:8000` (when running via `uvicorn app.main:app --reload` or Docker).

**Auth:** All endpoints except `/` and `/health` require:
```bash
Authorization: Bearer <SUPABASE_JWT>
```
Get a JWT by signing in via Supabase Auth (e.g. from the frontend) and use the session's `access_token`.

---

## Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root: message + list of endpoints |
| GET | `/health` | Health check |

---

## Auth helpers (login/refresh = no auth; me = Bearer)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Sign in with email + password; returns `access_token`, `refresh_token`, `user` |
| POST | `/auth/refresh` | Exchange `refresh_token` for new `access_token` and `refresh_token` |
| GET | `/auth/me` | Return current user (`user_id`, `email`) from Bearer token |

---

## Admin / ingestion

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users (admin only; ?page=&per_page=) |
| PATCH | `/admin/users/{user_id}/role` | Set user role to admin or student (admin only; JSON: role) |
| POST | `/admin/content/ingest` | Ingest course content (JSON: course_id, category, content_type, file_url, title?, week?, topic?, tags?, language?) |

---

## Courses

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/courses` | Create course (JSON: code, title, description?) |
| GET | `/courses` | List all courses |
| GET | `/courses/{course_id}` | Get course by ID |
| GET | `/courses/{course_id}/contents` | List course contents (?category=&week=) |
| POST | `/courses/{course_id}/search` | RAG search + answer (JSON: query, category?, topic?, language?, top_k?) |
| POST | `/courses/{course_id}/search/images` | Image search (JSON: query, top_k?, min_similarity?) |
| POST | `/courses/{course_id}/media/generate` | Generate educational media (JSON: type, material_id, style?) |
| POST | `/courses/{course_id}/generate/theory` | Generate theory material (JSON: topic, depth?) |
| POST | `/courses/{course_id}/generate/lab` | Generate lab material (JSON: topic, language) |
| POST | `/courses/{course_id}/handwritten/ingest` | Ingest handwritten note (JSON: image url) |

---

## Materials

| Method | Path | Description |
|--------|------|-------------|
| POST | `/materials/{material_id}/validate` | Validate generated material |

---

## Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/session` | Create chat session (JSON: course_id) |
| POST | `/chat/{session_id}` | Send message (JSON: message) |

---

## Storage

| Method | Path | Description |
|--------|------|-------------|
| POST | `/storage/upload` | Upload file (multipart: file, file_type, folder?) |

---

## Search (utility)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/namespaces` | List document namespaces |

---

## cURL examples

### Public (no auth)

```bash
# Root
curl -s http://localhost:8000/

# Health
curl -s http://localhost:8000/health
```

### Auth helpers (no Bearer for login/refresh)

```bash
# Login (returns access_token and refresh_token)
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'

# Refresh token
curl -s -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

### Protected (replace YOUR_JWT with access_token from /auth/login)

```bash
# Get current user (verify token)
curl -s -H "Authorization: Bearer YOUR_JWT" http://localhost:8000/auth/me

# List courses
curl -s -H "Authorization: Bearer YOUR_JWT" http://localhost:8000/courses

# Get course (use a real course_id from list)
curl -s -H "Authorization: Bearer YOUR_JWT" http://localhost:8000/courses/COURSE_UUID

# RAG search (course_id + body)
curl -s -X POST http://localhost:8000/courses/COURSE_UUID/search \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is an AVL tree?", "top_k": 5}'

# Create chat session
curl -s -X POST http://localhost:8000/chat/session \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"course_id": "COURSE_UUID"}'

# Send chat message (use session_id from above)
curl -s -X POST http://localhost:8000/chat/SESSION_UUID \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain binary search."}'
```
