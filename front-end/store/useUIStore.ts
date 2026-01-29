import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_STORAGE_KEY } from "@/lib/constants";

export type Theme = "light" | "dark" | "system";

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);
