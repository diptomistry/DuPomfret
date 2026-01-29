import { API_BASE_URL } from "@/lib/constants";
import { BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";

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
}

export interface GeneratedContent {
  title: string;
  type: "notes" | "slides" | "pdf" | "code";
  body: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window === "undefined") return headers;
  const token = localStorage.getItem(BEARER_TOKEN_STORAGE_KEY);
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function listMaterials(): Promise<CourseMaterial[]> {
  const res = await fetch(`${API_BASE_URL}/ingest/materials`, {
    next: { revalidate: 10 },
  });
  return handleResponse<CourseMaterial[]>(res);
}

export async function uploadMaterial(
  formData: FormData
): Promise<CourseMaterial> {
  const res = await fetch(`${API_BASE_URL}/storage/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<CourseMaterial>(res);
}

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ query }),
  });
  return handleResponse<SearchResult[]>(res);
}

export async function ragQuery(query: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/rag/query`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ query }),
  });
  const data = await handleResponse<{ answer: string }>(res);
  return data.answer;
}

export async function generateLearningMaterial(options: {
  topic: string;
  component: CourseComponent;
  type: GeneratedContent["type"];
  language?: string;
}): Promise<GeneratedContent> {
  const res = await fetch(`${API_BASE_URL}/media/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return handleResponse<GeneratedContent>(res);
}

export async function validateCodeSnippet(code: string, language: string) {
  const res = await fetch(`${API_BASE_URL}/rag/validate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  });
  return handleResponse<{
    isValid: boolean;
    diagnostics?: string[];
    testsPassed?: boolean;
  }>(res);
}

export async function chatWithCourse(
  history: Omit<ChatMessage, "id" | "createdAt">[]
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  return handleResponse<ChatMessage>(res);
}

