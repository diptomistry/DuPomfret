import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-4 text-center",
                className,
            )}
        >
            {Icon && (
                <div className="mb-4 rounded-full border border-border/60 bg-muted/40 p-4 backdrop-blur-sm">
                    <Icon className="size-8 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

interface ErrorStateProps {
    title?: string;
    message: string;
    action?: React.ReactNode;
    className?: string;
}

export function ErrorState({
    title = "Something went wrong",
    message,
    action,
    className,
}: ErrorStateProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center backdrop-blur-sm",
                className,
            )}
        >
            <h3 className="text-lg font-semibold text-destructive">{title}</h3>
            <p className="mt-1.5 text-sm text-destructive/80">{message}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
