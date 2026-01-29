"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateCodeSnippet } from "@/lib/api";

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
        "Validation failed. Ensure the /rag/validate-code endpoint is implemented."
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Code Validation & Evaluation
            </h1>
            <p className="text-muted-foreground text-sm">
              Check syntax, run automated tests, and surface diagnostics for lab
              code snippets.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Validate code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleValidate}>
                <div className="grid gap-4 sm:grid-cols-[1fr,2fr]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Input
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. python, cpp, java"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">
                      Code snippet to validate
                    </label>
                    <textarea
                      className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste generated or student lab code here..."
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isChecking}>
                  {isChecking ? "Validating..." : "Run validation"}
                </Button>
              </form>
              {error && (
                <p className="text-sm text-destructive" aria-live="polite">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Validation result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p
                  className={
                    result.isValid
                      ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-sm font-medium text-destructive"
                  }
                >
                  {result.isValid
                    ? "Code passed basic validation."
                    : "Issues detected in the provided code."}
                </p>
                {typeof result.testsPassed === "boolean" && (
                  <p className="text-sm text-muted-foreground">
                    Automated tests:{" "}
                    {result.testsPassed ? "all passed" : "some failed"}
                  </p>
                )}
                {result.diagnostics && result.diagnostics.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.diagnostics.map((d, idx) => (
                      <li key={idx}>• {d}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

