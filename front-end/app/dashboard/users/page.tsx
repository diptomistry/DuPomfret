"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { listUsers, updateUserRole, type UserListItem } from "@/lib/admin-api";
import { ROUTES } from "@/lib/constants";
import { Users, Loader2, Shield, GraduationCap, ArrowLeft } from "lucide-react";

export default function UsersPage() {
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const token = session?.access_token ?? null;

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || role !== "admin") {
      setLoading(false);
      if (role !== "admin") setError("Admin only.");
      return;
    }
    let cancelled = false;
    listUsers(token, { page: 1, per_page: 100 })
      .then((data) => {
        if (!cancelled) setUsers(data.users ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, role]);

  async function handleSetRole(userId: string, newRole: "admin" | "student") {
    if (!token) return;
    setUpdatingId(userId);
    setError(null);
    try {
      await updateUserRole(token, userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (role !== "admin") {
    return (
      <div className="min-h-svh">
        <Navbar />
        <AppShell>
          <div className="page-shell">
            <div className="page-stack">
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Shield className="size-12 mx-auto mb-4 opacity-50" />
                  <p>Only admins can manage user roles.</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href={ROUTES.DASHBOARD}>
                      <ArrowLeft className="size-4 mr-2" />
                      Back to dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </AppShell>
      </div>
    );
  }

  return (
    <div className="min-h-svh">
      <Navbar />
      <AppShell>
        <div className="page-shell">
          <div className="page-stack">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
                  <Users className="size-7 text-primary" />
                  User management
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  List users and set role to Admin or Student. New signups (e.g. Google) default to Student.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.DASHBOARD_COURSES}>
                  <ArrowLeft className="size-4 mr-1" />
                  Courses
                </Link>
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">All users</CardTitle>
                <CardDescription>
                  Change a user&apos;s role to Admin or Student. Role is stored in Supabase app_metadata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    Loading users…
                  </div>
                ) : users.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground text-sm">
                    No users found.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Email</th>
                          <th className="text-left py-3 px-2 font-medium">Role</th>
                          <th className="text-left py-3 px-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b last:border-0">
                            <td className="py-3 px-2">{u.email ?? u.id.slice(0, 8) + "…"}</td>
                            <td className="py-3 px-2">
                              <Badge variant={u.role === "admin" ? "primary" : "secondary"} className="gap-1">
                                {u.role === "admin" ? (
                                  <Shield className="size-3" />
                                ) : (
                                  <GraduationCap className="size-3" />
                                )}
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 flex flex-wrap gap-2">
                              {u.role !== "admin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updatingId === u.id}
                                  onClick={() => handleSetRole(u.id, "admin")}
                                >
                                  {updatingId === u.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    "Make admin"
                                  )}
                                </Button>
                              )}
                              {u.role !== "student" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updatingId === u.id}
                                  onClick={() => handleSetRole(u.id, "student")}
                                >
                                  {updatingId === u.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    "Make student"
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </div>
  );
}
