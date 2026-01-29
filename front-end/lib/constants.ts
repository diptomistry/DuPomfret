export const ROUTES = {
  HOME: "/",
  // During the demo we bypass auth by sending all "login" navigation
  // directly to the dashboard. To re-enable auth later, change this
  // back to "/auth/login".
  LOGIN: "/dashboard",
  CALLBACK: "/auth/callback",
  DASHBOARD: "/dashboard",
  DASHBOARD_CONTENT: "/dashboard/content",
  DASHBOARD_SEARCH: "/dashboard/search",
  DASHBOARD_GENERATE: "/dashboard/generate",
  DASHBOARD_VALIDATE: "/dashboard/validate",
  DASHBOARD_CHAT: "/dashboard/chat",
} as const;

export const THEME_STORAGE_KEY = "theme";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
