import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  displayName: string | null;
  setUser: (user: User | null, session: Session | null) => void;
  /**
   * Simple front-end only demo auth.
   * When using real Supabase auth, prefer setUser instead.
   */
  setDemoUser: (displayName: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  displayName: null,
  setUser: (user, session) =>
    set({
      user,
      session,
      isAuthenticated: !!user && !!session,
      displayName: user?.user_metadata?.full_name ?? user?.email ?? null,
    }),
  setDemoUser: (displayName: string) =>
    set({
      user: null,
      session: null,
      isAuthenticated: true,
      displayName,
    }),
  logout: () =>
    set({ user: null, session: null, isAuthenticated: false, displayName: null }),
}));
