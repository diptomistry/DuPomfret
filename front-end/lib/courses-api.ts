import { API_BASE_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types (match backend)
// ---------------------------------------------------------------------------

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
}

export interface CourseContent {
  id: string;
  course_id: string;
  category: string;
  title: string;
  week: number | null;
  topic: string | null;
  tags: string[] | null;
  content_type: string;
  file_url: string;
  language: string | null;
}

export interface IngestRequest {
  course_id: string;
  category: "theory" | "lab";
  content_type: string;
  file_url: string;
  title?: string;
  week?: number;
  topic?: string;
  tags?: string[];
  language?: string;
}

export interface UploadResponse {
  url: string;
  provider: string;
  key: string;
  file_type: string;
  content_type: string;
  size_bytes: number;
}

export interface IngestResponse {
  message: string;
  chunks: number;
  content_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Course API (all require Bearer token)
// ---------------------------------------------------------------------------

/** List all courses (student & admin). */
export async function listCourses(token: string): Promise<Course[]> {
  const res = await fetch(`${API_BASE_URL}/courses`, {
    headers: authHeaders(token),
  });
  return handleResponse<Course[]>(res);
}

/** Get a single course by ID. */
export async function getCourse(
  token: string,
  courseId: string
): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
    headers: authHeaders(token),
  });
  return handleResponse<Course>(res);
}

/** List contents for a course (optional filters). */
export async function listCourseContents(
  token: string,
  courseId: string,
  params?: { category?: string; week?: number }
): Promise<CourseContent[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.week != null) search.set("week", String(params.week));
  const qs = search.toString();
  const url = `${API_BASE_URL}/courses/${courseId}/contents${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleResponse<CourseContent[]>(res);
}

/** Create a course (admin only). */
export async function createCourse(
  token: string,
  body: { code: string; title: string; description?: string }
): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/admin/courses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<Course>(res);
}

/** Ingest course content (admin only). */
export async function ingestCourseContent(
  token: string,
  body: IngestRequest
): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE_URL}/admin/content/ingest`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return handleResponse<IngestResponse>(res);
}

/** Delete a course content item (admin only). */
export async function deleteCourseContent(token: string, contentId: string): Promise<{ message: string; deleted_documents: number; storage_deleted: boolean }> {
  const res = await fetch(`${API_BASE_URL}/admin/content/${contentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse<any>(res);
}

/** Upload file to storage (returns public URL for use in ingest). Auth required. */
export async function uploadFile(
  token: string,
  file: File,
  fileType: string,
  folder?: string
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("file_type", fileType);
  if (folder) form.append("folder", folder);
  const res = await fetch(`${API_BASE_URL}/storage/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return handleResponse<UploadResponse>(res);
}
