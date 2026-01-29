import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="min-h-svh relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
            {/* Enhanced Background Effects */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[20%] top-[15%] size-[500px] rounded-full bg-gradient-to-br from-primary/15 via-purple-500/15 to-pink-500/10 blur-3xl animate-pulse" />
                <div
                    className="absolute right-[20%] bottom-[15%] size-[500px] rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-primary/10 blur-3xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[300px] rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl" />
            </div>

            {/* Professional Back Button */}
            <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10">
                <Link href={ROUTES.HOME}>
                    <div className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-background/80 backdrop-blur-md hover:bg-background hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 group-hover:from-primary/20 group-hover:to-purple-500/20 transition-all">
                            <ArrowLeft className="size-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                            Back to Home
                        </span>
                    </div>
                </Link>
            </div>

            {/* Login Card with Enhanced Design */}
            <Card className="w-full max-w-lg border-2 border-border/50 shadow-2xl relative backdrop-blur-sm bg-card/95 overflow-hidden">
                {/* Card Decorative Elements */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
                <div className="absolute -top-24 -right-24 size-48 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-3xl" />

                <CardHeader className="space-y-6 pb-8 pt-10 text-center relative">
                    {/* Logo with Enhanced Animation */}
                    <div className="mx-auto">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-purple-600 blur-xl opacity-50 animate-pulse" />
                            <div className="relative inline-flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-pink-500 shadow-2xl shadow-primary/40">
                                <Sparkles className="size-10 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Title with Gradient */}
                    <div className="space-y-3">
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                            Welcome to{" "}
                            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                Orion
                            </span>
                        </CardTitle>
                        <p className="text-base text-muted-foreground">
                            Your intelligent course companion awaits
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="pb-10 px-8 relative">
                    {error ? (
                        <div
                            className="mb-6 rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur-sm flex items-center gap-3 shadow-lg shadow-destructive/10"
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
                    <LoginForm />

                    {/* Footer Text */}
                    <div className="mt-8 pt-6 border-t border-border/50 text-center">
                        <p className="text-xs text-muted-foreground">
                            By continuing, you agree to Orion's Terms of Service
                            and Privacy Policy
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
