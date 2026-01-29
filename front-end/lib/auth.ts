import type { User, Session } from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;

export function getAuthDisplayName(user: User | null): string {
  if (!user) return "";
  return user.user_metadata?.full_name ?? user.email ?? user.id;
}
