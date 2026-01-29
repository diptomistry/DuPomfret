"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants";

export function useAuth() {
  const router = useRouter();
  const { setUser, logout: clearStore } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
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
    await supabase.auth.signOut();
    clearStore();
    router.push(ROUTES.HOME);
    router.refresh();
  }

  return { logout };
}
