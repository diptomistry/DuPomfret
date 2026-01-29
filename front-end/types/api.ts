// Shared API types for the AI-powered learning platform

// -------- Courses --------

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
}

export interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
}

export type CourseCategory = "theory" | "lab";

export type CourseContentType = "slide" | "pdf" | "code" | "note" | "image";

export interface CourseContent {
  id: string;
  course_id: string;
  category: CourseCategory;
  title: string;
  week?: number;
  topic?: string;
  tags?: string[];
  content_type: CourseContentType;
  file_url: string;
  language?: string;
}

// -------- Search (Text) --------

export interface SearchRequest {
  query: string;
  category?: CourseCategory;
  topic?: string;
  language?: string;
  top_k?: number;
}

export interface SourceMetadata {
  type: string;
  source: string;
  url?: string;
  user_id?: string;
  // Allow arbitrary extra metadata from backend
  [key: string]: unknown;
}

export interface Source {
  content: string;
  metadata: SourceMetadata;
}

export interface SearchResponse {
  answer: string;
  sources: Source[];
}

// -------- Image Search --------

export interface ImageSearchRequest {
  query: string;
  top_k?: number;
  min_similarity?: number;
}

export interface ImageSearchResult {
  url: string;
  similarity: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ImageSearchResponse {
  results: ImageSearchResult[];
}

// -------- Generation --------

export type TheoryDepth = "exam-oriented" | "conceptual";

export type TheoryFormat = "notes" | "slides" | "pdf";

export interface GenerateTheoryRequest {
  topic: string;
  depth: TheoryDepth;
  format?: TheoryFormat;
  week?: number;
  topic_filter?: string;
}

export interface GenerateLabRequest {
  topic: string;
  language: string;
  week?: number;
  topic_filter?: string;
}

export interface GeneratedMaterial {
  id: string;
  course_id: string;
  category: CourseCategory;
  prompt: string;
  output: string;
  supported_languages?: string[];
  grounding_score?: number;
  sources?: Source[];
  format?: TheoryFormat;
}

// -------- Chat --------

export interface ChatSession {
  id: string;
  user_id: string;
  course_id: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export interface ChatRequestBody {
  message: string;
}

export interface ChatResponseBody {
  answer: string;
}

// -------- Media Generation --------

export type MediaGenerationType =
  | "content-to-video"
  | "slides-to-video"
  | "theory-diagram";

export type MediaGenerationStyle = "lecture" | "whiteboard" | "explainer";

export interface MediaGenerationRequest {
  type: MediaGenerationType;
  material_id: string;
  style: MediaGenerationStyle;
}

export interface MediaGenerationResponse {
  type: string;
  url: string;
  prompt: string;
  input_images?: string[];
}

// -------- Validation --------

export interface MaterialValidationResponse {
  syntax: string;
  grounding_score: number;
  tests_passed: boolean;
  final_verdict: string;
}

export interface CodeValidationApiResponse {
  is_valid: boolean;
  diagnostics?: string[];
  tests_passed?: boolean | null;
}

// -------- File Upload --------

export interface UploadResponse {
  url: string;
  provider: string;
  key: string;
  file_type: string;
  content_type: string;
  size_bytes: number;
}

// -------- Handwritten Notes --------

export interface HandwrittenNoteResponse {
  id: string;
  course_id: string;
  original_image_url: string;
  latex_output?: string | null;
}

// -------- Ingestion --------

export interface IngestCourseContentRequest {
  course_id: string;
  category: CourseCategory;
  content_type: CourseContentType;
  file_url: string;
  title?: string;
  week?: number;
  topic?: string;
  tags?: string[];
  language?: string;
}

