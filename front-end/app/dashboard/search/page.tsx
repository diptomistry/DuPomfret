"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchResult, semanticSearch, ragQuery } from "@/lib/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setRagAnswer(null);
    try {
      const [docs, answer] = await Promise.all([
        semanticSearch(query),
        ragQuery(query),
      ]);
      setResults(docs);
      setRagAnswer(answer);
    } catch (err) {
      console.error(err);
      setError("Search failed. Check the backend /search and /rag/query APIs.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Intelligent Course Search
            </h1>
            <p className="text-muted-foreground text-sm">
              Ask natural-language questions to retrieve relevant documents,
              excerpts, and code snippets from your course.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={handleSearch}
              >
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Explain quicksort vs mergesort"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </form>
              {error && (
                <p className="text-sm text-destructive" aria-live="polite">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          {ragAnswer && (
            <Card>
              <CardHeader>
                <CardTitle>RAG answer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {ragAnswer}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Retrieved passages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No results yet. Run a query to see matching content.
                </p>
              ) : (
                results.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{r.source}</span>
                      <span className="text-xs text-muted-foreground">
                        Score: {r.score.toFixed(3)} • {r.component}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {r.snippet}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

