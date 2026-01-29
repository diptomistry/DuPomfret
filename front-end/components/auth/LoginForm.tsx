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

    if (sent) {
        return (
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center space-y-4 backdrop-blur-sm shadow-lg shadow-primary/10">
                <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center ring-4 ring-primary/10">
                    <svg
                        className="size-8 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <div className="space-y-2">
                    <p className="text-lg font-bold text-foreground">
                        Check your email
                    </p>
                    <p className="text-sm text-muted-foreground">
                        We've sent a magic link to
                    </p>
                    <p className="text-sm font-semibold text-primary">
                        {email}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="space-y-2.5">
                <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-foreground"
                >
                    Email Address
                </Label>
                <div className="relative">
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        disabled={loading}
                        className="h-12 px-4 border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
            </div>
            {error ? (
                <div
                    className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3 shadow-lg shadow-destructive/10"
                    role="alert"
                >
                    <div className="flex-shrink-0 flex items-center justify-center size-8 rounded-lg bg-destructive/20">
                        <svg
                            className="size-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <span className="font-medium">{error}</span>
                </div>
            ) : null}
            <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                disabled={loading}
            >
                {loading && <Loader2 className="size-5 animate-spin mr-2" />}
                {loading ? "Sending magic link…" : "Continue with Email"}
            </Button>

            <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
                    <span className="bg-card px-4 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>

            <GoogleLoginButton />
        </form>
    );
}
