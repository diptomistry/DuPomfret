import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container flex flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6">
        <div className="max-w-xl space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hackathon Starter
          </h1>
          <p className="text-muted-foreground">
            Next.js boilerplate with Supabase auth, Zustand, theming, and clean
            architecture. Ready for AI API hackathons.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link href={ROUTES.LOGIN}>Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={ROUTES.DASHBOARD}>Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
