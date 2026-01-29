import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";

type SearchParams = { [k: string]: string | string[] | undefined };

const USE_DEMO_AUTH =
  process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "true" ||
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let error: string | null = null;

  if (!USE_DEMO_AUTH) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(ROUTES.DASHBOARD);
    }

    const params = await searchParams;
    error = typeof params.error === "string" ? params.error : null;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={ROUTES.HOME} aria-label="Back to home">
                <ArrowLeft className="size-4" data-slot="icon" />
              </Link>
            </Button>
            <CardTitle className="text-xl">
              {USE_DEMO_AUTH
                ? "Continue to demo workspace"
                : "Sign in to your course workspace"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Access AI-augmented Theory and Lab materials, semantic search, and a
            conversational tutor tailored to your enrolled course.
          </p>
          {error ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
