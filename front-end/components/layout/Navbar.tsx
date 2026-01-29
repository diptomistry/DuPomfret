"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ROUTES } from "@/lib/constants";
import { LogOut, LayoutDashboard, Sparkles, Users } from "lucide-react";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const isReady = useAuthStore((s) => s.isReady);
  const { logout } = useAuth();
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  // Only consider authenticated once auth initialization has completed.
  const isAuthenticated = isReady && !!user && !!session;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-2xl dark:bg-background/60 dark:border-border/30 dark:shadow-black/20">
      <div className="flex h-16 sm:h-18 items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 max-w-screen-2xl mx-auto w-full">
        <Link
          href={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME}
          className="flex items-center gap-2.5 sm:gap-3 text-foreground transition-all duration-200 hover:opacity-90 group"
        >
          <span className="relative inline-flex size-9 sm:size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-purple-600 text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
            <Sparkles className="size-4 sm:size-5" />
            <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <span className="text-base sm:text-lg font-bold tracking-tight">
            Orion
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isReady ? (
            isAuthenticated ? (
              <>
                {!isDashboard && (
                  <Button
                    variant="ghost"
                    asChild
                    className="gap-2 h-9 sm:h-10 px-3 sm:px-4 text-sm"
                  >
                    <Link href={ROUTES.DASHBOARD}>
                      <LayoutDashboard className="size-4" />
                      <span className="hidden sm:inline font-medium">
                        Dashboard
                      </span>
                    </Link>
                  </Button>
                )}
                {isDashboard && (
                  <Button
                    variant="ghost"
                    asChild
                    className="gap-2 h-9 sm:h-10 px-3 sm:px-4 text-sm"
                  >
                    <Link href={ROUTES.DASHBOARD}>
                      <LayoutDashboard className="size-4" />
                      <span className="hidden sm:inline font-medium">Home</span>
                    </Link>
                  </Button>
                )}
                {role === "admin" && (
                  <Button
                    variant="ghost"
                    asChild
                    className="gap-2 h-9 sm:h-10 px-3 sm:px-4 text-sm"
                  >
                    <Link href={ROUTES.DASHBOARD_USERS}>
                      <Users className="size-4" />
                      <span className="hidden sm:inline font-medium">
                        Users
                      </span>
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={() => logout()}
                  className="size-9 sm:size-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-4 sm:size-5" data-slot="icon" />
                </Button>
              </>
            ) : (
              // Show a small placeholder while auth is being determined to avoid
              // flashing the "Sign In" button briefly.
              <div className="h-9 sm:h-10 w-24" />
            )
          ) : (
            <Button
              asChild
              className="h-9 sm:h-10 px-4 sm:px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <Link href={ROUTES.LOGIN}>Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
