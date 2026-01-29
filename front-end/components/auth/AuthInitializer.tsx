"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

type InitialSessionPayload = {
  session: { access_token: string; refresh_token: string; expires_at: number } | null;
  user: { id: string; email: string | null; user_metadata: any } | null;
} | null;

/**
 * Component that ensures auth state is initialized on mount.
 * This should be included in the root layout to ensure auth sync happens early.
 */
export function AuthInitializer({ initialSession }: { initialSession?: InitialSessionPayload }) {
  // Pass server-provided session (if any) into the auth hook to hydrate client state.
  // Debug: log the initial session payload we received from the server.
  // This helps verify hydration in the browser console.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("AuthInitializer initialSession:", initialSession);
  }
  useAuth(initialSession ?? null);
  return null;
}
