"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGoogleLogin() {
    const redirectTo = `${window.location.origin}${ROUTES.CALLBACK}`;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" data-slot="icon" />
      ) : null}
      {loading ? "Signing in…" : "Continue with Google"}
    </Button>
  );
}
