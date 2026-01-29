import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default:
                    "border border-border/60 bg-card/60 text-foreground backdrop-blur-sm",
                primary: "border border-primary/30 bg-primary/15 text-primary",
                secondary:
                    "border border-secondary/60 bg-secondary/80 text-secondary-foreground",
                success: "border border-success/30 bg-success/15 text-success",
                destructive:
                    "border border-destructive/30 bg-destructive/15 text-destructive",
                outline: "border border-border text-foreground",
                theory: "border border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400",
                lab: "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps
    extends
        React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
