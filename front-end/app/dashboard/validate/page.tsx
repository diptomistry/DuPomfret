"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { validateCodeSnippet } from "@/lib/api";
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Code,
    Loader2,
    Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ValidatePage() {
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("");
    const [result, setResult] = useState<{
        isValid: boolean;
        diagnostics?: string[];
        testsPassed?: boolean;
    } | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleValidate(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;
        setIsChecking(true);
        setError(null);
        try {
            const res = await validateCodeSnippet(code, language);
            setResult(res);
        } catch (err) {
            console.error(err);
            setError(
                "Validation failed. Ensure the /rag/validate-code endpoint is implemented.",
            );
        } finally {
            setIsChecking(false);
        }
    }

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Header */}
                        <div className="page-header">
                            <h1 className="page-title">Code Checker</h1>
                            <p className="page-description">
                                Check syntax, run tests, and get diagnostics for
                                your lab code.
                            </p>
                        </div>

                        {/* Validation Form */}
                        <Card>
                            <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <Code className="size-4 sm:size-5 text-primary" />
                                    Validate Code
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Paste your code and select a language to
                                    check.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                                <form
                                    className="space-y-4"
                                    onSubmit={handleValidate}
                                >
                                    <div className="grid gap-3 sm:gap-4 sm:grid-cols-[180px,1fr]">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="language"
                                                className="text-xs sm:text-sm"
                                            >
                                                Language
                                            </Label>
                                            <Input
                                                id="language"
                                                value={language}
                                                onChange={(e) =>
                                                    setLanguage(e.target.value)
                                                }
                                                placeholder="e.g. python, cpp, java"
                                                disabled={isChecking}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="code">
                                            Code Snippet
                                        </Label>
                                        <Textarea
                                            id="code"
                                            className="min-h-[250px] font-mono text-sm"
                                            value={code}
                                            onChange={(e) =>
                                                setCode(e.target.value)
                                            }
                                            placeholder="Paste generated or student lab code here..."
                                            disabled={isChecking}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isChecking || !code.trim()}
                                        className="gap-2 w-full sm:w-auto"
                                    >
                                        {isChecking ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Checking...
                                            </>
                                        ) : (
                                            <>
                                                <Terminal className="size-4" />
                                                Check Code
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {error && <ErrorState message={error} />}
                            </CardContent>
                        </Card>

                        {/* Loading State */}
                        {isChecking && <SkeletonCard />}

                        {/* Result Card */}
                        {!isChecking && result && (
                            <Card
                                className={cn(
                                    "border-2",
                                    result.isValid
                                        ? "border-success/40"
                                        : "border-destructive/40",
                                )}
                            >
                                <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                        {result.isValid ? (
                                            <CheckCircle className="size-4 sm:size-5 text-success" />
                                        ) : (
                                            <XCircle className="size-4 sm:size-5 text-destructive" />
                                        )}
                                        Validation Result
                                        <Badge
                                            variant={
                                                result.isValid
                                                    ? "success"
                                                    : "destructive"
                                            }
                                            className="ml-auto"
                                        >
                                            {result.isValid
                                                ? "Passed"
                                                : "Issues Found"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Status Message */}
                                    <p
                                        className={cn(
                                            "text-sm font-medium",
                                            result.isValid
                                                ? "text-success"
                                                : "text-destructive",
                                        )}
                                    >
                                        {result.isValid
                                            ? "✓ Code passed basic validation."
                                            : "✗ Issues detected in the provided code."}
                                    </p>

                                    {/* Test Results */}
                                    {typeof result.testsPassed ===
                                        "boolean" && (
                                        <div className="flex items-center gap-2 text-sm">
                                            {result.testsPassed ? (
                                                <CheckCircle className="size-4 text-success" />
                                            ) : (
                                                <AlertTriangle className="size-4 text-yellow-500" />
                                            )}
                                            <span className="text-muted-foreground">
                                                Automated tests:{" "}
                                                <span
                                                    className={
                                                        result.testsPassed
                                                            ? "text-success"
                                                            : "text-yellow-500"
                                                    }
                                                >
                                                    {result.testsPassed
                                                        ? "all passed"
                                                        : "some failed"}
                                                </span>
                                            </span>
                                        </div>
                                    )}

                                    {/* Diagnostics */}
                                    {result.diagnostics &&
                                        result.diagnostics.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Diagnostics:
                                                </p>
                                                <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-4 backdrop-blur-sm">
                                                    {result.diagnostics.map(
                                                        (d, idx) => (
                                                            <li
                                                                key={idx}
                                                                className="flex items-start gap-2 text-sm text-muted-foreground"
                                                            >
                                                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                                                                <span className="font-mono text-xs">
                                                                    {d}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
