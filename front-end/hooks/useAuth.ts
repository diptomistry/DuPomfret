"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";
import { ROUTES, BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";
import type { Session } from "@supabase/supabase-js";

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

export function useAuth() {
  const router = useRouter();
  const { setUser, setRole, setReady, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Initialize auth state immediately
    let mounted = true;

    async function syncFromServerIfNeeded() {
      // If server has a session (cookie-based) but browser storage doesn't,
      // we can pull tokens from our own API route (which can read HttpOnly cookies)
      // and set them into the browser supabase client (local storage).
      try {
        const res = await fetch("/api/auth/session", { method: "GET" });
        const data = (await res.json()) as {
          session: { access_token: string; refresh_token: string } | null;
        };
        if (!mounted) return;
        if (data?.session?.access_token && data?.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
      } catch {
        // ignore
      }
    }

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        // If browser doesn't see a session but server does, sync first.
        if (!session) {
          await syncFromServerIfNeeded();
        }

        const { data: { session: session2 } } = await supabase.auth.getSession();
        if (!mounted) return;

        const user = session2?.user ?? null;
        setUser(user, session2 ?? null);

        if (user?.id) {
          const role = await fetchUserRole(supabase, user.id);
          if (mounted) {
            setRole(role);
          }
        } else {
          setRole("student");
        }

        syncTokenToStorage(session2 ?? null);
      } catch (err) {
        console.error("Failed to initialize auth:", err);
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

      if (user?.id) {
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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore - we'll still clear client state below
    }

    // Also clear the browser Supabase client session + localStorage token.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
    }

    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
