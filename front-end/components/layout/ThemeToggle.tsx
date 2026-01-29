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
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-input bg-muted/50" />
        );
    }

    const currentIndex = themes.findIndex((t) => t.value === theme);
    const CurrentIcon = themes[currentIndex]?.icon || Sun;
    const next = themes[(currentIndex + 1) % themes.length];

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Theme: ${theme}. Switch to ${next.value}.`}
            onClick={() => setTheme(next.value)}
            className={cn(
                "size-9 sm:size-10 rounded-xl transition-all duration-200",
                "hover:bg-primary/10 hover:text-primary",
            )}
        >
            <CurrentIcon
                className="size-4 sm:size-5 transition-transform duration-200"
                data-slot="icon"
            />
        </Button>
    );
}
