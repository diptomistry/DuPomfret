"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { ROUTES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${ROUTES.CALLBACK}` },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Check your inbox for the sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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
        {loading ? "Sending…" : "Send magic link"}
      </Button>
      <div className="relative">
        <span className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </span>
        <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
          Or
        </span>
      </div>
      <GoogleLoginButton />
    </form>
  );
}
