"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROUTES, API_BASE_URL } from "@/lib/constants";
import type { UserRole } from "@/store/useAuthStore";

async function fetchMeRole(accessToken: string): Promise<UserRole> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "student";
  const data = (await res.json()) as { role?: string };
  const role = (data.role ?? "student").toLowerCase();
  return role === "admin" ? "admin" : "student";
}

export function useAuth() {
  const router = useRouter();
  const { setUser, setRole, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const applySession = (session: { access_token: string } | null) => {
      setUser(session?.user ?? null, session ?? null);
      if (session?.access_token) {
        fetchMeRole(session.access_token).then(setRole);
      } else {
        setRole("student");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser, setRole]);

  async function logout() {
    await supabase.auth.signOut();
    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
