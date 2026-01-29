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
  const { setUser, setRole, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Initialize auth state immediately
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        if (mounted) {
          setUser(null, null);
          setRole("student");
        }
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
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, setUser, setRole]);

  async function logout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined")
      localStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
