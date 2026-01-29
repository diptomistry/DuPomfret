import { API_BASE_URL, BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";
import type {
  Course,
  CourseContent,
  SearchRequest,
  SearchResponse,
  ImageSearchRequest,
  ImageSearchResponse,
  GenerateTheoryRequest,
  GenerateLabRequest,
  GeneratedMaterial,
  ChatSession,
  ChatRequestBody,
  ChatResponseBody,
  MediaGenerationRequest,
  MediaGenerationResponse,
  MaterialValidationResponse,
  CodeValidationApiResponse,
  UploadResponse,
  HandwrittenNoteResponse,
  CreateCourseRequest,
  IngestCourseContentRequest,
} from "@/types/api";

// ============================================================================
// Helper Functions
// ============================================================================

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BEARER_TOKEN_STORAGE_KEY);
}

function buildHeaders(includeJson = false): HeadersInit {
  const headers: HeadersInit = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

async function apiPostFormData<T>(url: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<T>(res);
}

// ============================================================================
// Course APIs
// ============================================================================

export async function listCourses(): Promise<Course[]> {
  return apiGet<Course[]>(`${API_BASE_URL}/courses`);
}

export async function getCourse(courseId: string): Promise<Course> {
  return apiGet<Course>(`${API_BASE_URL}/courses/${courseId}`);
}

export async function listCourseContents(
  courseId: string,
  category?: "theory" | "lab",
  week?: number,
): Promise<CourseContent[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (week !== undefined) params.append("week", week.toString());
  const query = params.toString();
  return apiGet<CourseContent[]>(
    `${API_BASE_URL}/courses/${courseId}/contents${query ? `?${query}` : ""}`,
  );
}

export async function createCourse(
  request: CreateCourseRequest,
): Promise<Course> {
  return apiPost<Course>(`${API_BASE_URL}/admin/courses`, request);
}

// ============================================================================
// Storage & Ingestion APIs
// ============================================================================

export async function uploadFile(formData: FormData): Promise<UploadResponse> {
  return apiPostFormData<UploadResponse>(`${API_BASE_URL}/storage/upload`, formData);
}

export async function ingestCourseContent(
  request: IngestCourseContentRequest,
): Promise<{ message: string; chunks: number; content_id: string }> {
  return apiPost(`${API_BASE_URL}/admin/content/ingest`, request);
}

// ============================================================================
// Search APIs
// ============================================================================

export async function searchCourse(
  courseId: string,
  request: SearchRequest,
): Promise<SearchResponse> {
  return apiPost<SearchResponse>(
    `${API_BASE_URL}/courses/${courseId}/search`,
    request,
  );
}

export async function searchCourseImages(
  courseId: string,
  request: ImageSearchRequest,
): Promise<ImageSearchResponse> {
  return apiPost<ImageSearchResponse>(
    `${API_BASE_URL}/courses/${courseId}/search/images`,
    request,
  );
}

// ============================================================================
// Generation APIs
// ============================================================================

export async function generateTheory(
  courseId: string,
  request: GenerateTheoryRequest,
): Promise<GeneratedMaterial> {
  return apiPost<GeneratedMaterial>(
    `${API_BASE_URL}/courses/${courseId}/generate/theory`,
    request,
  );
}

export async function generateLab(
  courseId: string,
  request: GenerateLabRequest,
): Promise<GeneratedMaterial> {
  return apiPost<GeneratedMaterial>(
    `${API_BASE_URL}/courses/${courseId}/generate/lab`,
    request,
  );
}

export async function generateCourseMedia(
  courseId: string,
  request: MediaGenerationRequest,
): Promise<MediaGenerationResponse> {
  return apiPost<MediaGenerationResponse>(
    `${API_BASE_URL}/courses/${courseId}/media/generate`,
    request,
  );
}

// ============================================================================
// Validation APIs
// ============================================================================

export async function validateMaterial(
  materialId: string,
): Promise<MaterialValidationResponse> {
  return apiPost<MaterialValidationResponse>(
    `${API_BASE_URL}/materials/${materialId}/validate`,
  );
}

// ============================================================================
// Chat APIs
// ============================================================================

export async function createChatSession(
  courseId: string,
): Promise<ChatSession> {
  return apiPost<ChatSession>(`${API_BASE_URL}/chat/session`, {
    course_id: courseId,
  });
}

export async function sendChatMessage(
  sessionId: string,
  request: ChatRequestBody,
): Promise<ChatResponseBody> {
  return apiPost<ChatResponseBody>(
    `${API_BASE_URL}/chat/${sessionId}`,
    request,
  );
}

// ============================================================================
// Handwritten Notes APIs
// ============================================================================

export async function ingestHandwrittenNote(
  courseId: string,
  imageUrl: string,
): Promise<HandwrittenNoteResponse> {
  return apiPost<HandwrittenNoteResponse>(
    `${API_BASE_URL}/courses/${courseId}/handwritten/ingest`,
    { image: imageUrl },
  );
}

// ============================================================================
// Backward Compatibility (Legacy Dashboard Pages)
// ============================================================================

export type CourseComponent = "theory" | "lab";

export interface CourseMaterial {
  id: string;
  title: string;
  component: CourseComponent;
  week?: number;
  topic?: string;
  tags?: string[];
  type: "slide" | "pdf" | "code" | "note" | "other";
  url?: string;
  createdAt?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  snippet: string;
  source: string;
  component: CourseComponent;
  url?: string;
}

export interface GeneratedContent {
  title: string;
  type: "notes" | "slides" | "pdf" | "code";
  body: string;
  language?: string;
}

type SemanticSearchOptions = {
  category?: CourseComponent;
  language?: string;
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

// Legacy functions for backward compatibility
export async function listMaterials(): Promise<CourseMaterial[]> {
  const courses = await listCourses();
  if (courses.length === 0) return [];
  const firstCourse = courses[0];
  const contents = await listCourseContents(firstCourse.id);
  return contents.map((c) => ({
    id: c.id,
    title: c.title,
    component: c.category,
    week: c.week,
    topic: c.topic,
    tags: c.tags,
    type: c.content_type === "image" ? "other" : c.content_type,
    url: c.file_url,
  }));
}

export async function uploadMaterial(formData: FormData): Promise<CourseMaterial> {
  const result = await uploadFile(formData);
  // Return a minimal CourseMaterial - legacy pages may need course context
  return {
    id: result.key,
    title: result.key,
    component: "theory",
    type: result.file_type.includes("pdf") ? "pdf" : "other",
    url: result.url,
  };
}

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  const courses = await listCourses();
  if (courses.length === 0) return [];
  const firstCourse = courses[0];
  const result = await searchCourse(firstCourse.id, { query, top_k: 5 });
  return result.sources.map((source, idx) => ({
    id: `result-${idx}`,
    score: 0.8, // Placeholder
    snippet: source.content.substring(0, 200),
    source: source.metadata.source || "unknown",
    component: (source.metadata.category as CourseComponent) || "theory",
  }));
}

export async function ragQuery(query: string): Promise<string> {
  const courses = await listCourses();
  if (courses.length === 0) return "No courses available.";
  const firstCourse = courses[0];
  const result = await searchCourse(firstCourse.id, { query, top_k: 5 });
  return result.answer;
}

// Course-scoped variants used by the search dashboard
export async function semanticSearchForCourse(
  query: string,
  courseId?: string,
  options?: SemanticSearchOptions,
): Promise<SearchResult[]> {
  let targetCourseId = courseId;
  if (!targetCourseId) {
    const courses = await listCourses();
    if (courses.length === 0) return [];
    targetCourseId = courses[0].id;
  }

  const result = await searchCourse(targetCourseId, {
    query,
    top_k: 5,
    category: options?.category,
    language: options?.language,
  });
  return result.sources.map((source, idx) => ({
    id: `result-${idx}`,
    score: 0.8, // Placeholder until backend returns per-source similarity
    snippet: source.content.substring(0, 200),
    source: source.metadata.source || "unknown",
    component: (source.metadata.category as CourseComponent) || "theory",
  }));
}

export async function ragQueryForCourse(
  query: string,
  courseId?: string,
  options?: SemanticSearchOptions,
): Promise<string> {
  let targetCourseId = courseId;
  if (!targetCourseId) {
    const courses = await listCourses();
    if (courses.length === 0) return "No courses available.";
    targetCourseId = courses[0].id;
  }

  const result = await searchCourse(targetCourseId, {
    query,
    top_k: 5,
    category: options?.category,
    language: options?.language,
  });
  return result.answer;
}

export async function generateLearningMaterial(options: {
  topic: string;
  component: CourseComponent;
  type: GeneratedContent["type"];
  language?: string;
}): Promise<GeneratedContent> {
  const courses = await listCourses();
  if (courses.length === 0) {
    throw new Error("No courses available");
  }
  const firstCourse = courses[0];

  if (options.component === "theory") {
    const result = await generateTheory(firstCourse.id, {
      topic: options.topic,
      depth: "exam-oriented",
    });
    return {
      title: options.topic,
      type: options.type,
      body: result.output,
    };
  } else {
    const result = await generateLab(firstCourse.id, {
      topic: options.topic,
      language: options.language || "python",
    });
    return {
      title: options.topic,
      type: "code",
      body: result.output,
      language: options.language,
    };
  }
}

export async function validateCodeSnippet(
  code: string,
  language: string,
): Promise<{
  isValid: boolean;
  diagnostics?: string[];
  testsPassed?: boolean;
}> {
  const response = await apiPost<CodeValidationApiResponse>(
    `${API_BASE_URL}/rag/validate-code`,
    { code, language },
  );

  return {
    isValid: response.is_valid,
    diagnostics: response.diagnostics ?? [],
    testsPassed: response.tests_passed ?? undefined,
  };
}

export async function chatWithCourse(
  history: Omit<ChatMessage, "id" | "createdAt">[],
): Promise<ChatMessage> {
  const courses = await listCourses();
  if (courses.length === 0) {
    throw new Error("No courses available");
  }
  const firstCourse = courses[0];

  // Create or reuse a session (simplified - in real app, manage sessions)
  const session = await createChatSession(firstCourse.id);
  const lastMessage = history[history.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must be from user");
  }

  const response = await sendChatMessage(session.id, {
    message: lastMessage.content,
  });

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: response.answer,
    createdAt: new Date().toISOString(),
  };
}
