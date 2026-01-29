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
import { ArrowLeft, GraduationCap } from "lucide-react";

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
        <div className="min-h-svh relative overflow-hidden flex items-center justify-center p-4">
            {/* Subtle Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute right-1/3 bottom-1/4 size-96 rounded-full bg-purple-500/10 blur-3xl" />
            </div>

            {/* Back Button */}
            <div className="absolute top-6 left-6">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-2"
                >
                    <Link href={ROUTES.HOME}>
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                </Button>
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-md glass-card border-glass-border/50 shadow-2xl relative">
                <CardHeader className="space-y-4 pb-6 text-center">
                    {/* Logo */}
                    <div className="mx-auto">
                        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-xl shadow-primary/25">
                            <GraduationCap className="size-7 text-white" />
                        </div>
                    </div>
                    
                    {/* Title */}
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold">
                            Sign In
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Access your course workspace
                        </p>
                    </div>
                </CardHeader>
                
                <CardContent className="pb-8">
                    {error ? (
                        <div
                            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive backdrop-blur-sm flex items-center gap-2"
                            role="alert"
                        >
                            <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    ) : null}
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    );
}
