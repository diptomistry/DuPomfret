export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  CALLBACK: "/auth/callback",
  DASHBOARD: "/dashboard",
  DASHBOARD_COURSES: "/dashboard/courses",
  DASHBOARD_USERS: "/dashboard/users",
  DASHBOARD_CONTENT: "/dashboard/content",
  DASHBOARD_SEARCH: "/dashboard/search",
  DASHBOARD_GENERATE: "/dashboard/generate",
  DASHBOARD_VALIDATE: "/dashboard/validate",
  DASHBOARD_CHAT: "/dashboard/chat",
  DASHBOARD_ASSISTANT: "/dashboard/assistant",
} as const;

export const THEME_STORAGE_KEY = "theme";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
