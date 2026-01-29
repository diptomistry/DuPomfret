import { cn } from "@/lib/utils";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-muted/60 backdrop-blur-sm",
                className,
            )}
            {...props}
        />
    );
}

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("glass-panel rounded-xl p-6 space-y-4", className)}>
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-9 w-24" />
        </div>
    );
}

function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="glass-panel-soft rounded-lg p-4 flex items-center gap-4"
                >
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export { Skeleton, SkeletonCard, SkeletonList };
