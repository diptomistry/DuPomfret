import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft, Sparkles } from "lucide-react";

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.DASHBOARD);
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href={ROUTES.HOME} aria-label="Back to home">
                <ArrowLeft className="size-4" data-slot="icon" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                <Sparkles className="size-4" />
              </span>
              <CardTitle className="text-lg sm:text-xl">
                Sign in to your workspace
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            Access AI-augmented Theory and Lab materials, semantic search, and a
            conversational tutor tailored to your enrolled course.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive backdrop-blur-sm" role="alert">
              {error}
            </div>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
