"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";
import { ROUTES, BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";
import type { Session } from "@supabase/supabase-js";

type InitialSessionPayload = {
  session: { access_token: string; refresh_token: string; expires_at: number } | null;
  user: { id: string; email: string | null; user_metadata: any } | null;
} | null;

function syncTokenToStorage(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session?.access_token) {
    localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, session.access_token);
  } else {
    localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
  }
}

async function fetchUserRole(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.warn("Failed to fetch user role:", error);
      return "student"; // Default to student if not found
    }

    return (data.role as UserRole) || "student";
  } catch (error) {
    console.warn("Error fetching user role:", error);
    return "student"; // Default to student on error
  }
}

export function useAuth(initialServerSession?: InitialSessionPayload | null) {
  const router = useRouter();
  const { setUser, setRole, setReady, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Initialize auth state immediately
    let mounted = true;

    async function syncFromServerIfNeeded(): Promise<Session | null> {
      // If server has a session (cookie-based) but browser storage doesn't,
      // pull tokens from our API route (which can read HttpOnly cookies)
      // and set them into the browser supabase client (local storage).
      // Return the resulting session if we successfully set it, otherwise null.
      try {
        const res = await fetch("/api/auth/session", { method: "GET" });
        const data = (await res.json()) as {
          session: { access_token: string; refresh_token: string } | null;
        };
        if (!mounted) return null;
        if (data?.session?.access_token && data?.session?.refresh_token) {
          const { data: setData, error } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (error || !setData?.session) return null;
          return setData.session as Session;
        }
        return null;
      } catch {
        // ignore and return null
        return null;
      }
    }

    async function initializeAuth() {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.debug("useAuth initialServerSession:", { hasServerSession: !!initialServerSession });
      }
      try {
        // If server provided an initial session payload, hydrate the browser supabase client
        // using those tokens so we avoid an extra getSession() roundtrip.
        if (initialServerSession && initialServerSession.session?.access_token) {
          const { access_token, refresh_token } = initialServerSession.session;
          const { data: setData, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!mounted) return;
          const finalSession: Session | null = error || !setData?.session ? null : (setData.session as Session);

          // If setSession failed (sometimes server-side tokens aren't accepted by the browser client),
          // fall back to hydrating the local store from the server payload so UI stays consistent.
          const user = finalSession?.user ?? (initialServerSession.user as any) ?? null;
          const sessionToStore = finalSession ?? (initialServerSession.session ? ({ access_token: initialServerSession.session.access_token } as unknown as Session) : null);
          if (typeof window !== "undefined") {
            // eslint-disable-next-line no-console
            console.debug("useAuth hydrating from server:", { finalSessionExists: !!finalSession, user: user?.id ?? null });
          }
          setUser(user, sessionToStore ?? null);

          if (user?.id) {
            const role = await fetchUserRole(supabase, user.id);
            if (mounted) {
              setRole(role);
            }
          } else {
            setRole("student");
          }

          // Ensure token is available in localStorage for API calls that rely on it.
          syncTokenToStorage(sessionToStore ?? null);
          if (mounted) setReady(true);
          return;
        }

        // Default client-driven flow
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        // If browser doesn't see a session, try syncing from server and use the
        // session returned by that operation to avoid an extra getSession() roundtrip.
        let finalSession: Session | null = session ?? null;
        if (!finalSession) {
          const synced = await syncFromServerIfNeeded();
          if (!mounted) return;
          finalSession = synced ?? null;
        }

        const user = finalSession?.user ?? null;
        setUser(user, finalSession ?? null);

        // Prefer role from token metadata (app_metadata or user_metadata) or top-level role claim
        const metaRole =
          (user as any)?.app_metadata?.role ??
          (user as any)?.user_metadata?.role ??
          (user as any)?.role;
        if (metaRole) {
          setRole(metaRole as UserRole);
        } else if (user?.id) {
          const role = await fetchUserRole(supabase, user.id);
          if (mounted) {
            setRole(role);
          }
        } else {
          setRole("student");
        }

        syncTokenToStorage(finalSession ?? null);
      } catch (err: any) {
        // Supabase/goTrue may abort internal requests when newer requests start
        // (or during fast refresh). Treat AbortError as non-fatal and avoid noisy logs.
        const isAbort =
          (err && (err.name === "AbortError" || err.message?.includes?.("signal is aborted"))) ||
          false;
        if (!isAbort) {
          console.error("Failed to initialize auth:", err);
        } else {
          // eslint-disable-next-line no-console
          console.debug("initializeAuth aborted (ignored):", err?.message ?? err);
        }

        if (mounted) {
          setUser(null, null);
          setRole("student");
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const user = session?.user ?? null;
      setUser(user, session ?? null);

      // Use metadata role (app_metadata or user_metadata) if available, otherwise fetch from DB.
      const metaRole =
        (user as any)?.app_metadata?.role ??
        (user as any)?.user_metadata?.role ??
        (user as any)?.role;
      if (metaRole) {
        setRole(metaRole as UserRole);
      } else if (user?.id) {
        const role = await fetchUserRole(supabase, user.id);
        if (mounted) {
          setRole(role);
        }
      } else {
        setRole("student");
      }

      syncTokenToStorage(session ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, setUser, setRole]);

  async function logout() {
    // Ask server to clear HttpOnly auth cookies (so SSR + middleware see logout).
    let serverLogoutError: any = null;
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        serverLogoutError = await res.text();
      }
    } catch (err) {
      serverLogoutError = err;
    }

    // Also clear the browser Supabase client session + localStorage token.
    let signOutError: any = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      signOutError = err;
    } finally {
      // Always clear client-side state to ensure the UI reflects logout immediately.
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
        }
      } catch {
        // ignore localStorage errors
      }

      clearStore();
      // Navigate back to home and refresh so server middleware also sees cleared cookies.
      try {
        router.push(ROUTES.HOME);
        router.refresh();
      } catch {
        // ignore navigation errors
      }
    }

    // Log non-abort errors for debugging (but don't block UX).
    const isAbort = (e: any) =>
      e && (e.name === "AbortError" || typeof e === "string" && e.includes("signal is aborted"));
    if (serverLogoutError && !isAbort(serverLogoutError)) {
      // eslint-disable-next-line no-console
      console.error("Server logout error:", serverLogoutError);
    }
    if (signOutError && !isAbort(signOutError)) {
      // eslint-disable-next-line no-console
      console.error("Supabase signOut error:", signOutError);
    }
  }

  return { logout };
}
