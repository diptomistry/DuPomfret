"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants";

const USE_DEMO_AUTH =
  process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "true" ||
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

export function useAuth() {
  const router = useRouter();
  const { setUser, logout: clearStore } = useAuthStore();
  const supabase = useMemo(
    () => (USE_DEMO_AUTH ? null : createClient()),
    []
  );

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null, session ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null, session ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser]);

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
