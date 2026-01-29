"use client";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthInitializer } from "@/components/auth/AuthInitializer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ThemeProvider />
      <AuthInitializer />
      {children}
    </ToastProvider>
  );
}
