"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ROUTES } from "@/lib/constants";
import { LogOut } from "lucide-react";

export function Navbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
        <Link
          href={ROUTES.HOME}
          className="font-semibold text-foreground hover:opacity-80"
        >
          App
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={() => logout()}
              >
                <LogOut className="size-4" data-slot="icon" />
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href={ROUTES.LOGIN}>Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
