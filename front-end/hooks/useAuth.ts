"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants";

const BEARER_TOKEN_KEY = "bearer_tokenBUET";

function syncTokenToStorage(session: { access_token: string } | null) {
  if (typeof window === "undefined") return;
  if (session?.access_token) {
    localStorage.setItem(BEARER_TOKEN_KEY, session.access_token);
  } else {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  }
}

export function useAuth() {
  const router = useRouter();
  const { setUser, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null, session ?? null);
      syncTokenToStorage(session ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null, session ?? null);
      syncTokenToStorage(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser]);

  async function logout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem(BEARER_TOKEN_KEY);
    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
