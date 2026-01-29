"use client";

import { useMounted } from "@/hooks/useMounted";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/store/useUIStore";

const themes: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useUIStore();

  if (!mounted) {
    return (
      <div className="flex size-10 items-center justify-center rounded-md border border-input bg-background" />
    );
  }

  const currentIndex = themes.findIndex((t) => t.value === theme);
  const next = themes[(currentIndex + 1) % themes.length];
  const Icon = next.icon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Switch to ${next.value}.`}
      onClick={() => setTheme(next.value)}
      className={cn("size-9")}
    >
      <Icon className="size-4" data-slot="icon" />
    </Button>
  );
}
