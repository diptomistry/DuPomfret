import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthDisplayName } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const displayName = getAuthDisplayName(user);

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {displayName || "User"}
          </h1>
          <p className="text-muted-foreground">
            You’re in. Use this dashboard as your hackathon starting point.
          </p>
          <Button variant="outline" asChild>
            <Link href={ROUTES.HOME}>Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
