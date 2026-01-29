"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { ROUTES } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const USE_DEMO_AUTH =
  process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "true" ||
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { setDemoUser } = useAuthStore();
  const supabase = USE_DEMO_AUTH ? null : createClient();

  async function handleEmailSubmit(e: React.FormEvent) {
    console.log("handleEmailSubmit", email);  
    e.preventDefault();
    setError(null);

    if (!supabase) return;

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.CALLBACK}`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!USE_DEMO_AUTH && sent) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Check your inbox for the sign-in link.
      </p>
    );
  }

  // Simple, robust front-end only auth for the demo.
  if (USE_DEMO_AUTH) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="demo-identity">Email or name (demo)</Label>
          <Input
            id="demo-identity"
            type="text"
            placeholder="demo.student@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              const nameOrEmail = email || "Demo Student";
              setDemoUser(nameOrEmail);
              router.push(ROUTES.DASHBOARD);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to start demo session"
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" data-slot="icon" />
          ) : null}
          {loading ? "Signing in…" : "Continue to demo dashboard"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">
          {USE_DEMO_AUTH ? "Email or name (demo)" : "Email"}
        </Label>
        <Input
          id="email"
          type={USE_DEMO_AUTH ? "text" : "email"}
          placeholder={
            USE_DEMO_AUTH ? "demo.student@university.edu" : "you@example.com"
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!USE_DEMO_AUTH}
          autoComplete="email"
          disabled={loading}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" data-slot="icon" />
        ) : null}
        {USE_DEMO_AUTH
          ? loading
            ? "Signing in…"
            : "Continue to demo dashboard"
          : loading
          ? "Sending…"
          : "Send magic link"}
      </Button>
      {!USE_DEMO_AUTH && (
        <>
          <div className="relative">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </span>
            <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
              Or
            </span>
          </div>
          <GoogleLoginButton />
        </>
      )}
    </form>
  );
}
