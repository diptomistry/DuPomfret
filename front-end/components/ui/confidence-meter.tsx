"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  value: number; // 0-1 or 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceMeter({
  value,
  size = "md",
  showLabel = true,
  className,
}: ConfidenceMeterProps) {
  // Normalize to 0-100
  const percentage = value > 1 ? value : value * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Determine color based on confidence level
  const getColorClass = () => {
    if (clampedPercentage >= 80) return "bg-success";
    if (clampedPercentage >= 60) return "bg-primary";
    if (clampedPercentage >= 40) return "bg-yellow-500";
    return "bg-destructive";
  };

  const getGlowClass = () => {
    if (clampedPercentage >= 80) return "shadow-[var(--glow-success)]";
    if (clampedPercentage >= 60) return "shadow-[var(--glow-primary)]";
    return "";
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            getColorClass(),
            getGlowClass()
          )}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums text-muted-foreground min-w-[3ch]">
          {Math.round(clampedPercentage)}%
        </span>
      )}
    </div>
  );
}

interface ConfidenceChipProps {
  value: number;
  label?: string;
  className?: string;
}

export function ConfidenceChip({
  value,
  label = "Confidence",
  className,
}: ConfidenceChipProps) {
  const percentage = value > 1 ? value : value * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const getVariantClass = () => {
    if (clampedPercentage >= 80)
      return "border-success/30 bg-success/15 text-success";
    if (clampedPercentage >= 60)
      return "border-primary/30 bg-primary/15 text-primary";
    if (clampedPercentage >= 40)
      return "border-yellow-500/30 bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
    return "border-destructive/30 bg-destructive/15 text-destructive";
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
        getVariantClass(),
        className
      )}
    >
      <span className="opacity-70">{label}:</span>
      <span className="tabular-nums font-semibold">
        {Math.round(clampedPercentage)}%
      </span>
    </div>
  );
}
