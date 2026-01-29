"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
    generateCourseMedia,
    generateLab,
    generateTheory,
    listCourses,
    searchCourseImages,
    validateMaterial,
} from "@/lib/api";
import {
    Sparkles,
    FileText,
    Presentation,
    BookOpen,
    Loader2,
    Video,
    Image as ImageIcon,
    Copy,
    CheckCircle,
} from "lucide-react";
import type {
    Course,
    GeneratedMaterial,
    ImageSearchResponse,
    MaterialValidationResponse,
    MediaGenerationResponse,
    TheoryDepth,
    TheoryFormat,
} from "@/types/api";

const typeIcons = {
    notes: BookOpen,
    slides: Presentation,
    pdf: FileText,
};

export default function GeneratePage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseId, setCourseId] = useState<string>("");

    const [topic, setTopic] = useState("");
    const [component, setComponent] = useState<"theory" | "lab">("theory");
    const [depth, setDepth] = useState<TheoryDepth>("exam-oriented");
    const [format, setFormat] = useState<TheoryFormat>("notes");
    const [language, setLanguage] = useState("python");

    const [output, setOutput] = useState<GeneratedMaterial | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [media, setMedia] = useState<MediaGenerationResponse | null>(null);
    const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
    const [validation, setValidation] =
        useState<MaterialValidationResponse | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [images, setImages] = useState<ImageSearchResponse | null>(null);
    const [isLoadingImages, setIsLoadingImages] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const list = await listCourses();
                setCourses(list);
                if (!courseId && list.length > 0) setCourseId(list[0].id);
            } catch (e) {
                console.error(e);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault();
        if (!topic.trim()) return;
        if (!courseId) {
            setError("Please select a course first.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        setMedia(null);
        setValidation(null);
        setImages(null);
        try {
            if (component === "theory") {
                const result = await generateTheory(courseId, {
                    topic,
                    depth,
                    format,
                });
                setOutput(result);
            } else {
                const result = await generateLab(courseId, { topic, language });
                setOutput(result);
            }
        } catch (err) {
            console.error(err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Generation failed. Please ensure you have courses available and are authenticated.";
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleGenerateMedia(
        materialId: string,
        type: "content-to-video" | "slides-to-video" | "theory-diagram",
    ) {
        if (!courseId) return;
        try {
            setIsGeneratingMedia(true);
            const res = await generateCourseMedia(courseId, {
                type,
                material_id: materialId,
                style: "lecture",
            });
            setMedia(res);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Failed to generate media");
        } finally {
            setIsGeneratingMedia(false);
        }
    }

    async function handleValidate(materialId: string) {
        try {
            setIsValidating(true);
            const res = await validateMaterial(materialId);
            setValidation(res);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Validation failed");
        } finally {
            setIsValidating(false);
        }
    }

    async function handleFindImages(q: string) {
        if (!courseId || !q.trim()) return;
        try {
            setIsLoadingImages(true);
            const res = await searchCourseImages(courseId, {
                query: q,
                top_k: 8,
                min_similarity: 0.7,
            });
            setImages(res);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Image search failed");
        } finally {
            setIsLoadingImages(false);
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    const canGenerateMedia =
        !!validation && validation.final_verdict === "ready_for_students";

    const TypeIcon = typeIcons[format] || FileText;

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Header */}
                        <div className="page-header">
                            <h1 className="page-title">AI Generator</h1>
                            <p className="page-description">
                                Create notes, slide outlines, and code examples
                                from your course content.
                            </p>
                        </div>

                        {/* Generation Form */}
                        <Card>
                            <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <Sparkles className="size-4 sm:size-5 text-primary" />
                                    Create Content
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Describe what you want to generate and pick
                                    a format.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                                <form
                                    className="space-y-4"
                                    onSubmit={handleGenerate}
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="course">Course</Label>
                                        <Select
                                            id="course"
                                            value={courseId}
                                            onChange={(e) =>
                                                setCourseId(e.target.value)
                                            }
                                            disabled={isGenerating}
                                        >
                                            {courses.length === 0 ? (
                                                <option value="">
                                                    No courses found
                                                </option>
                                            ) : (
                                                courses.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.code}: {c.title}
                                                    </option>
                                                ))
                                            )}
                                        </Select>
                                    </div>

                                    {/* Topic Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="topic">
                                            Topic / Prompt
                                        </Label>
                                        <Input
                                            id="topic"
                                            value={topic}
                                            onChange={(e) =>
                                                setTopic(e.target.value)
                                            }
                                            placeholder="e.g. Dynamic Programming for shortest paths"
                                            disabled={isGenerating}
                                        />
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="component">
                                                Component
                                            </Label>
                                            <Select
                                                id="component"
                                                value={component}
                                                onChange={(e) =>
                                                    setComponent(e.target.value as "theory" | "lab")
                                                }
                                                disabled={isGenerating}
                                            >
                                                <option value="theory">
                                                    Theory
                                                </option>
                                                <option value="lab">Lab</option>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            {component === "theory" ? (
                                                <>
                                                    <Label htmlFor="format">
                                                        Format
                                                    </Label>
                                                    <Select
                                                        id="format"
                                                        value={format}
                                                        onChange={(e) =>
                                                            setFormat(
                                                                e.target
                                                                    .value as TheoryFormat,
                                                            )
                                                        }
                                                        disabled={isGenerating}
                                                    >
                                                        <option value="notes">
                                                            Reading Notes
                                                        </option>
                                                        <option value="slides">
                                                            Slides Outline
                                                        </option>
                                                        <option value="pdf">
                                                            PDF-style Handout
                                                        </option>
                                                    </Select>
                                                </>
                                            ) : (
                                                <>
                                                    <Label htmlFor="language">
                                                        Language
                                                    </Label>
                                                    <Input
                                                        id="language"
                                                        value={language}
                                                        onChange={(e) =>
                                                            setLanguage(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="e.g. python, java, c++"
                                                        disabled={isGenerating}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {component === "theory" ? (
                                                <>
                                                    <Label htmlFor="depth">
                                                        Depth
                                                    </Label>
                                                    <Select
                                                        id="depth"
                                                        value={depth}
                                                        onChange={(e) =>
                                                            setDepth(
                                                                e.target
                                                                    .value as TheoryDepth,
                                                            )
                                                        }
                                                        disabled={isGenerating}
                                                    >
                                                        <option value="exam-oriented">
                                                            Exam-oriented
                                                        </option>
                                                        <option value="conceptual">
                                                            Conceptual
                                                        </option>
                                                    </Select>
                                                </>
                                            ) : (
                                                <>
                                                    <Label>Supported</Label>
                                                    <div className="text-xs text-muted-foreground pt-2">
                                                        python, java, c++, javascript, go
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={isGenerating || !topic.trim()}
                                        className="gap-2 w-full sm:w-auto"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="size-4" />
                                                Create Content
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {error && <ErrorState message={error} />}
                            </CardContent>
                        </Card>

                        {/* Loading State */}
                        {isGenerating && (
                            <SkeletonCard className="min-h-[200px] sm:min-h-[300px]" />
                        )}

                        {/* Output Card */}
                        {!isGenerating && output && (
                            <Card className="border-primary/30">
                                <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 sm:p-2.5">
                                                <TypeIcon className="size-4 sm:size-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm sm:text-base">
                                                    {topic || "Generated Content"}
                                                </CardTitle>
                                                <CardDescription className="mt-0.5 text-xs">
                                                    {output.category}
                                                    {output.grounding_score != null
                                                        ? ` • grounding ${(output.grounding_score * 100).toFixed(0)}%`
                                                        : ""}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-10 sm:ml-0">
                                            <Badge
                                                variant={
                                                    component === "lab"
                                                        ? "lab"
                                                        : "theory"
                                                }
                                                className="text-xs"
                                            >
                                                {component}
                                            </Badge>
                                            {component === "theory" && (
                                                <Badge variant="primary" className="text-xs">
                                                    {format}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-6 pt-0">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                copyToClipboard(output.output)
                                            }
                                        >
                                            <Copy className="size-4 mr-2" />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleValidate(output.id)
                                            }
                                            disabled={isValidating}
                                        >
                                            <CheckCircle className="size-4 mr-2" />
                                            {isValidating ? "Validating..." : "Validate"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleGenerateMedia(
                                                    output.id,
                                                    "content-to-video",
                                                )
                                            }
                                            disabled={
                                                isGeneratingMedia || !canGenerateMedia
                                            }
                                        >
                                            <Video className="size-4 mr-2" />
                                            Video
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleGenerateMedia(
                                                    output.id,
                                                    "theory-diagram",
                                                )
                                            }
                                            disabled={
                                                isGeneratingMedia || !canGenerateMedia
                                            }
                                        >
                                            <ImageIcon className="size-4 mr-2" />
                                            Diagram
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleFindImages(topic)}
                                            disabled={isLoadingImages}
                                        >
                                            {isLoadingImages ? (
                                                <>
                                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                                    Images...
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="size-4 mr-2" />
                                                    Find images
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <pre className="max-h-[300px] sm:max-h-[500px] overflow-auto rounded-xl border border-border/60 bg-muted/40 p-3 sm:p-4 text-xs leading-relaxed font-mono backdrop-blur-sm">
                                        {output.output}
                                    </pre>

                                    {Array.isArray(output.sources) &&
                                        output.sources.length > 0 && (
                                            <details className="mt-4">
                                                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                                                    View sources ({output.sources.length})
                                                </summary>
                                                <div className="mt-3 space-y-3">
                                                    {output.sources.slice(0, 8).map((s, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="rounded-lg border border-border/60 bg-muted/30 p-3"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                                <div className="text-xs text-muted-foreground">
                                                                    {String(
                                                                        s.metadata
                                                                            ?.content_type ??
                                                                            s.metadata
                                                                                ?.source ??
                                                                            "source",
                                                                    )}
                                                                    {s.metadata?.week
                                                                        ? ` • week ${String(
                                                                              s.metadata.week,
                                                                          )}`
                                                                        : ""}
                                                                    {s.metadata?.topic
                                                                        ? ` • ${String(
                                                                              s.metadata.topic,
                                                                          )}`
                                                                        : ""}
                                                                </div>
                                                                {typeof s.metadata?.file_url ===
                                                                    "string" && (
                                                                    <a
                                                                        className="text-xs text-primary underline"
                                                                        href={String(
                                                                            s.metadata.file_url,
                                                                        )}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        Open
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                                                                {s.content.slice(0, 350)}
                                                                {s.content.length > 350 ? "…" : ""}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                    {validation && (
                                        <div className="mt-4 space-y-2">
                                            <div className="grid gap-2 sm:grid-cols-4">
                                                <Badge variant="outline">
                                                    Syntax: {validation.syntax}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Grounding:{" "}
                                                    {(validation.grounding_score * 100).toFixed(0)}%
                                                </Badge>
                                                <Badge variant="outline">
                                                    Tests:{" "}
                                                    {validation.tests_passed ? "passed" : "failed"}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Verdict: {validation.final_verdict}
                                                </Badge>
                                            </div>
                                            {!canGenerateMedia && (
                                                <p className="text-xs text-muted-foreground">
                                                    Run validation and wait for a{" "}
                                                    <span className="font-medium">
                                                        Verdict: ready_for_students
                                                    </span>{" "}
                                                    before generating diagrams or video.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {images && (
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {images.results.map((r, idx) => (
                                                <a
                                                    key={idx}
                                                    href={r.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group overflow-hidden rounded-lg border border-border/60"
                                                >
                                                    <img
                                                        src={r.url}
                                                        alt={r.content}
                                                        className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {media && (
                                        <div className="mt-4 rounded-lg border border-border/60 p-3">
                                            <div className="mb-2 text-sm font-medium">
                                                Media: {media.type}
                                            </div>
                                            {media.url.endsWith(".mp4") ? (
                                                <video
                                                    controls
                                                    src={media.url}
                                                    className="w-full max-w-2xl rounded-md"
                                                />
                                            ) : (
                                                <img
                                                    src={media.url}
                                                    alt={media.type}
                                                    className="w-full max-w-2xl rounded-md"
                                                />
                                            )}
                                            <div className="mt-2">
                                                <a
                                                    href={media.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary underline"
                                                >
                                                    Open media in new tab
                                                </a>
                                            </div>
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
