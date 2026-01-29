"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
    BookOpen,
    Search,
    Sparkles,
    CheckCircle,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    PenTool,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    {
        label: "Materials",
        shortLabel: "Files",
        href: ROUTES.DASHBOARD_CONTENT,
        icon: BookOpen,
        description: "Upload & manage course files",
    },
    {
        label: "Search",
        shortLabel: "Search",
        href: ROUTES.DASHBOARD_SEARCH,
        icon: Search,
        description: "Find content with AI",
    },
    {
        label: "Generate",
        shortLabel: "Create",
        href: ROUTES.DASHBOARD_GENERATE,
        icon: Sparkles,
        description: "Create AI study materials",
    },
    {
        label: "Chat",
        shortLabel: "Ask",
        href: ROUTES.DASHBOARD_CHAT,
        icon: MessageCircle,
        description: "Chat with AI tutor",
    },
    {
        label: "Notes",
        shortLabel: "Notes",
        href: ROUTES.DASHBOARD_NOTES,
        icon: PenTool,
        description: "Digitize handwritten notes",
    },
    {
        label: "Community",
        shortLabel: "Forum",
        href: ROUTES.DASHBOARD_COMMUNITY,
        icon: Users,
        description: "Discuss with peers & AI bot",
    },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "fixed left-0 top-16 sm:top-[4.5rem] z-40 hidden h-[calc(100svh-4rem)] sm:h-[calc(100svh-4.5rem)] flex-col border-r border-border/40 bg-background/80 backdrop-blur-2xl transition-all duration-300 ease-out md:flex dark:bg-background/60",
                collapsed ? "w-[4.5rem]" : "w-56 lg:w-64",
            )}
        >
            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/15 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon
                                className={cn(
                                    "size-5 shrink-0 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground group-hover:text-foreground",
                                )}
                            />
                            {!collapsed && (
                                <span className="truncate">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border/60 p-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="w-full justify-center"
                    aria-label={
                        collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight className="size-4" />
                    ) : (
                        <>
                            <ChevronLeft className="size-4" />
                            <span className="ml-2">Collapse</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/80 backdrop-blur-xl md:hidden">
            <div className="flex h-14 items-center justify-around px-1 pb-safe">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-all duration-200",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground active:text-foreground",
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "size-5 transition-all duration-200",
                                    isActive && "text-primary",
                                )}
                            />
                            <span className="truncate">{item.shortLabel}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    return (
        <>
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <MobileBottomNav />
            <main
                className={cn(
                    "min-h-[calc(100svh-4rem)] sm:min-h-[calc(100svh-4.5rem)] pb-16 transition-all duration-300 ease-out md:pb-0",
                    sidebarCollapsed ? "md:pl-[4.5rem]" : "md:pl-56 lg:pl-64",
                )}
            >
                {children}
            </main>
        </>
    );
}
