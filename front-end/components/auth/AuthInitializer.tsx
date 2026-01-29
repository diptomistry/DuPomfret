"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Component that ensures auth state is initialized on mount.
 * This should be included in the root layout to ensure auth sync happens early.
 */
export function AuthInitializer() {
  // Just calling useAuth ensures the hook runs and syncs auth state
  useAuth();
  return null;
}
