"use client";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthInitializer } from "@/components/auth/AuthInitializer";
import { useAuthStore } from "@/store/useAuthStore";
import { BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";

type InitialSessionPayload = {
  session: { access_token: string; refresh_token: string; expires_at: number } | null;
  user: { id: string; email: string | null; user_metadata: any } | null;
} | null;

export function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: InitialSessionPayload;
}) {
  // Synchronously hydrate the client auth store from the server-provided session
  // before any child renders. This prevents the Navbar from rendering a signed-out
  // state while server-rendered content assumes authentication.
  if (typeof window !== "undefined" && initialSession) {
    const store = useAuthStore.getState();
    const user = initialSession.user
      ? ({
          id: initialSession.user.id,
          email: initialSession.user.email,
          user_metadata: initialSession.user.user_metadata,
        } as any)
      : null;
    const session = initialSession.session
      ? ({ access_token: initialSession.session.access_token } as any)
      : null;

    // Only set if not already ready to avoid overwriting client-driven state.
    if (!useAuthStore.getState().isReady) {
      store.setUser(user, session);
      store.setRole("student"); // default; role will be refined by useAuth if needed
      store.setReady(true);
      if (session?.access_token) {
        try {
          localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, session.access_token);
        } catch {
          // ignore localStorage errors
        }
      }
    }
  }

  return (
    <ToastProvider>
      <ThemeProvider />
      <AuthInitializer initialSession={initialSession ?? null} />
      {children}
    </ToastProvider>
  );
}
