import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "student";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  /** From /auth/me: admin or student */
  role: UserRole;
  setUser: (user: User | null, session: Session | null) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  role: "student",
  setUser: (user, session) =>
    set({
      user,
      session,
      isAuthenticated: !!user && !!session,
    }),
  setRole: (role) => set({ role }),
  logout: () =>
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      role: "student",
    }),
}));
