"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

export function ThemeProvider() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");

    if (theme === "system") {
      const q = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => root.classList.toggle("dark", q.matches);
      apply();
      q.addEventListener("change", apply);
      return () => q.removeEventListener("change", apply);
    }

    if (theme === "dark") root.classList.add("dark");
  }, [theme]);

  return null;
}
