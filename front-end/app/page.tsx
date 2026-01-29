import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

const USE_DEMO_AUTH =
  process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "true" ||
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

export default async function HomePage() {
  if (!USE_DEMO_AUTH) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(ROUTES.DASHBOARD);
    }
  }
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6">
        <div className="w-full max-w-xl space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI-Powered Course Companion
          </h1>
          <p className="text-muted-foreground">
            One place for your university course slides, PDFs, lab code, and notes –
            with semantic search, AI-generated study material, and a chat tutor
            grounded in your syllabus.
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
