 "use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { SkeletonCard, SkeletonList } from "@/components/ui/skeleton";
import {
    SearchResult,
    semanticSearchForCourse,
    ragQueryForCourse,
} from "@/lib/api";
import { listCourses, type Course } from "@/lib/courses-api";
import { BEARER_TOKEN_STORAGE_KEY } from "@/lib/constants";
import { Select } from "@/components/ui/select";
import { Search, FileText, Sparkles, Loader2 } from "lucide-react";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [courseId, setCourseId] = useState<string | undefined>(undefined);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [componentFilter, setComponentFilter] = useState<
        "all" | "lab" | "theory"
    >("all");
    const [language, setLanguage] = useState<string>("");

    useEffect(() => {
        async function loadCourses() {
            setLoadingCourses(true);
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem(BEARER_TOKEN_STORAGE_KEY) : null;
                if (!token) {
                    setCourses([]);
                    return;
                }
                const cs = await listCourses(token);
                setCourses(cs || []);
            } catch (err) {
                console.error("Failed to load courses for selector:", err);
                setCourses([]);
            } finally {
                setLoadingCourses(false);
            }
        }

        loadCourses();
    }, []);
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
            const category =
                componentFilter === "all" ? undefined : componentFilter;
            const languageFilter =
                componentFilter === "lab" && language.trim()
                    ? language.trim()
                    : undefined;

            const [docs, answer] = await Promise.all([
                semanticSearchForCourse(query, courseId, {
                    category,
                    language: languageFilter,
                }),
                ragQueryForCourse(query, courseId, {
                    category,
                    language: languageFilter,
                }),
            ]);
            setResults(docs);
            setRagAnswer(answer);
        } catch (err) {
            console.error(err);
            setError(
                "Search failed. Check the backend /search and /rag/query APIs.",
            );
        } finally {
            setIsSearching(false);
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
                            <h1 className="page-title text-3xl sm:text-4xl font-bold mb-2">AI Search</h1>
                            <p className="page-description text-lg leading-relaxed mb-6 max-w-3xl">
                                Ask questions in plain English to find relevant documents, code snippets, and lab materials from your course.
                                Results are retrieved using semantic search and summarized with RAG. Use the filters to scope to labs, select language, or pick a course.
                            </p>
                        </div>

                        {/* Search Card */}
                        <Card>
                            <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <Search className="size-4 sm:size-5 text-primary" />
                                    Search Query
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                                <form
                                    className="flex flex-col gap-2 sm:gap-3 sm:flex-row items-center"
                                    onSubmit={handleSearch}
                                >
                                    <Input
                                        value={query}
                                        onChange={(e) =>
                                            setQuery(e.target.value)
                                        }
                                        placeholder="e.g. Explain quicksort vs mergesort"
                                        disabled={isSearching}
                                        className="flex-1 text-sm h-12"
                                    />

                                    {/* Scope & Filters */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={componentFilter}
                                            onChange={(e) =>
                                                setComponentFilter(
                                                    e.target.value as
                                                        | "all"
                                                        | "lab"
                                                        | "theory"
                                                )
                                            }
                                            disabled={isSearching}
                                            className="h-12 rounded-lg border px-3 text-sm"
                                            aria-label="Component filter"
                                        >
                                            <option value="all">All</option>
                                            <option value="lab">Lab</option>
                                            <option value="theory">Theory</option>
                                        </select>

                                        <Input
                                            value={language}
                                            onChange={(e) =>
                                                setLanguage(e.target.value)
                                            }
                                            placeholder="Language (e.g. python)"
                                            disabled={isSearching || componentFilter !== "lab"}
                                            className="w-40 text-sm h-12"
                                        />

                                        <div className="w-48">
                                            <label className="sr-only">Course</label>
                                            <Select
                                                value={courseId ?? ""}
                                                onChange={(e) => setCourseId(e.target.value || undefined)}
                                                disabled={isSearching || loadingCourses}
                                                className="h-12 text-base w-full rounded-lg"
                                            >
                                                <option value="">{loadingCourses ? "Loading..." : "All courses"}</option>
                                                {courses.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.code} — {c.title}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div className="ml-2">
                                            <Button
                                                type="submit"
                                                disabled={isSearching}
                                                size="lg"
                                                className="gap-2"
                                            >
                                                {isSearching ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        Searching...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="size-4" />
                                                        Search
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                                <div className="mt-3">
                                    <p className="text-sm text-muted-foreground">
                                        Try queries like: "explain nop sled", "merge sort complexity", or "example buffer overflow exploit".
                                    </p>
                                </div>
                                {error && <ErrorState message={error} />}
                            </CardContent>
                        </Card>

                        {/* Loading State */}
                        {isSearching && (
                            <div className="space-y-3 sm:space-y-4">
                                <SkeletonCard />
                                <SkeletonList count={3} />
                            </div>
                        )}

                        {/* RAG Answer */}
                        {!isSearching && ragAnswer && (
                            <Card className="border-primary/30">
                                <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                        <Sparkles className="size-4 sm:size-5 text-primary" />
                                        AI Summary
                                        <Badge
                                            variant="primary"
                                            className="ml-auto text-xs"
                                        >
                                            RAG
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-6 pt-0">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {ragAnswer}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Retrieved Passages */}
                        {!isSearching && (
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="size-5 text-muted-foreground" />
                                        Retrieved Passages
                                        {results.length > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-auto"
                                            >
                                                {results.length} results
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {results.length === 0 ? (
                                        <EmptyState
                                            icon={Search}
                                            title="No results yet"
                                            description="Run a search query to see matching content from your course materials."
                                        />
                                    ) : (
                                        results.map((r) => (
                                            <div
                                                key={r.id}
                                                className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-muted/50"
                                            >
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-medium text-sm">
                                                        {r.source}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={
                                                                r.component ===
                                                                "lab"
                                                                    ? "lab"
                                                                    : "theory"
                                                            }
                                                        >
                                                            {r.component}
                                                        </Badge>
                                                        <ConfidenceMeter
                                                            value={r.score}
                                                            size="sm"
                                                            className="w-20"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                                                    {r.snippet}
                                                </p>
                                        <div className="mt-3 flex justify-end">
                                            {r.url ? (
                                                <Button asChild size="sm" variant="outline">
                                                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                                                        View file
                                                    </a>
                                                </Button>
                                            ) : null}
                                        </div>
                                            </div>
                                        ))
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
