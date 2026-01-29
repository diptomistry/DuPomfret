"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getCourse,
  generateTheory,
  generateLab,
  generateCourseMedia,
  validateMaterial,
  searchCourseImages,
} from "@/lib/api";
import type {
  Course,
  GeneratedMaterial,
  MediaGenerationRequest,
  MaterialValidationResponse,
  MediaGenerationResponse,
  ImageSearchResponse,
  TheoryFormat,
} from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  Sparkles,
  BookOpen,
  Code,
  Loader2,
  ArrowLeft,
  Download,
  Copy,
  Video,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";

const LANGUAGES = ["python", "java", "c++", "javascript", "go"] as const;
const DEPTHS = ["exam-oriented", "conceptual"] as const;
const MEDIA_STYLES = ["lecture", "whiteboard", "explainer"] as const;
const THEORY_FORMATS: { value: TheoryFormat; label: string }[] = [
  { value: "notes", label: "Reading Notes" },
  { value: "slides", label: "Slides Outline" },
  { value: "pdf", label: "PDF-style Handout" },
];

export function CourseGenerateContent({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<"theory" | "lab">("theory");
  const [theoryForm, setTheoryForm] = useState({
    topic: "",
    depth: "exam-oriented" as typeof DEPTHS[number],
    format: "notes" as TheoryFormat,
  });
  const [labForm, setLabForm] = useState({
    topic: "",
    language: "python" as typeof LANGUAGES[number],
  });
  const [theoryResult, setTheoryResult] = useState<GeneratedMaterial | null>(
    null,
  );
  const [labResult, setLabResult] = useState<GeneratedMaterial | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [mediaResult, setMediaResult] = useState<MediaGenerationResponse | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<MaterialValidationResponse | null>(
    null,
  );
  const [images, setImages] = useState<ImageSearchResponse | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCourse(courseId);
        setCourse(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [courseId]);

  async function handleGenerateTheory(e: React.FormEvent) {
    e.preventDefault();
    if (!theoryForm.topic.trim()) return;

    try {
      setIsGenerating(true);
      setMediaResult(null);
      setValidation(null);
      setImages(null);
      const result = await generateTheory(courseId, {
        topic: theoryForm.topic,
        depth: theoryForm.depth,
        format: theoryForm.format,
      });
      setTheoryResult(result);
      toast("Theory material generated successfully", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Failed to generate theory material", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateLab(e: React.FormEvent) {
    e.preventDefault();
    if (!labForm.topic.trim()) return;

    try {
      setIsGenerating(true);
      setMediaResult(null);
      setValidation(null);
      setImages(null);
      const result = await generateLab(courseId, {
        topic: labForm.topic,
        language: labForm.language,
      });
      setLabResult(result);
      toast("Lab material generated successfully", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Failed to generate lab material", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateMedia(
    materialId: string,
    type: MediaGenerationRequest["type"],
  ) {
    try {
      setIsGeneratingMedia(true);
      const result = await generateCourseMedia(courseId, {
        type,
        material_id: materialId,
        style: "lecture",
      });
      setMediaResult(result);
      toast("Media generated", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Failed to generate media", "error");
    } finally {
      setIsGeneratingMedia(false);
    }
  }

  async function handleValidate(materialId: string) {
    try {
      setIsValidating(true);
      const result = await validateMaterial(materialId);
      setValidation(result);
      toast("Validation completed", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Validation failed", "error");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleFindImages(query: string) {
    if (!query.trim()) return;
    try {
      setIsLoadingImages(true);
      const res = await searchCourseImages(courseId, {
        query,
        top_k: 8,
        min_similarity: 0.7,
      });
      setImages(res);
      toast("Found relevant images", "success");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Image search failed", "error");
    } finally {
      setIsLoadingImages(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "success");
  }

  return (
    <div className="page-shell">
      <div className="page-stack">
        {/* Header */}
        <div className="page-header">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/courses/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Course
          </Button>
          <h1 className="page-title">
            {course ? `${course.code}: Generate` : "Generate Materials"}
          </h1>
          <p className="page-description">
            Generate theory notes and lab code using AI
          </p>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 border-b border-border/60 p-4">
              <button
                onClick={() => setActiveTab("theory")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "theory"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <BookOpen className="size-4" />
                Theory Generation
              </button>
              <button
                onClick={() => setActiveTab("lab")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "lab"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Code className="size-4" />
                Lab Generation
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Theory Generation */}
        {activeTab === "theory" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Generate Theory Material</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateTheory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theory_topic">Topic *</Label>
                    <Input
                      id="theory_topic"
                      value={theoryForm.topic}
                      onChange={(e) =>
                        setTheoryForm({ ...theoryForm, topic: e.target.value })
                      }
                      placeholder="e.g. Binary Search Tree"
                      disabled={isGenerating}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="depth">Depth</Label>
                      <Select
                        id="depth"
                        value={theoryForm.depth}
                        onChange={(e) =>
                          setTheoryForm({
                            ...theoryForm,
                            depth: e.target.value as typeof theoryForm.depth,
                          })
                        }
                        disabled={isGenerating}
                      >
                        {DEPTHS.map((depth) => (
                          <option key={depth} value={depth}>
                            {depth.charAt(0).toUpperCase() + depth.slice(1)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Select
                        id="format"
                        value={theoryForm.format}
                        onChange={(e) =>
                          setTheoryForm({
                            ...theoryForm,
                            format: e.target.value as TheoryFormat,
                          })
                        }
                        disabled={isGenerating}
                      >
                        {THEORY_FORMATS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isGenerating || !theoryForm.topic.trim()}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Theory
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {isGenerating && <SkeletonCard />}
            {theoryResult && !isGenerating && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Generated Theory Material</CardTitle>
                      {theoryResult.grounding_score && (
                        <Badge
                          variant={
                            theoryResult.grounding_score > 0.8
                              ? "default"
                              : theoryResult.grounding_score > 0.5
                                ? "secondary"
                                : "destructive"
                          }
                          className="mt-2"
                        >
                          Grounding:{" "}
                          {(theoryResult.grounding_score * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(theoryResult.output)
                        }
                      >
                        <Copy className="size-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleGenerateMedia(theoryResult.id, "content-to-video")
                        }
                        disabled={isGeneratingMedia}
                      >
                        <Video className="size-4 mr-2" />
                        Generate Video
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleGenerateMedia(theoryResult.id, "theory-diagram")
                        }
                        disabled={isGeneratingMedia}
                      >
                        <ImageIcon className="size-4 mr-2" />
                        Diagram
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidate(theoryResult.id)}
                        disabled={isValidating}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        {isValidating ? "Validating..." : "Validate"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                    {theoryResult.output}
                  </pre>
                  {Array.isArray(theoryResult.sources) &&
                    theoryResult.sources.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                          View sources ({theoryResult.sources.length})
                        </summary>
                        <div className="mt-3 space-y-3">
                          {theoryResult.sources.slice(0, 8).map((s, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-border/60 bg-muted/30 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="text-xs text-muted-foreground">
                                  {String(s.metadata?.content_type ?? s.metadata?.source ?? "source")}
                                  {s.metadata?.week ? ` • week ${String(s.metadata.week)}` : ""}
                                  {s.metadata?.topic ? ` • ${String(s.metadata.topic)}` : ""}
                                </div>
                                {typeof s.metadata?.file_url === "string" && (
                                  <a
                                    className="text-xs text-primary underline"
                                    href={String(s.metadata.file_url)}
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
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      <Badge variant="outline">Syntax: {validation.syntax}</Badge>
                      <Badge variant="outline">
                        Grounding: {(validation.grounding_score * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="outline">
                        Tests: {validation.tests_passed ? "passed" : "failed"}
                      </Badge>
                      <Badge variant="outline">Verdict: {validation.final_verdict}</Badge>
                    </div>
                  )}

                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleFindImages(theoryForm.topic)}
                      disabled={isLoadingImages}
                    >
                      {isLoadingImages ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Searching images...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-4 mr-2" />
                          Find relevant images
                        </>
                      )}
                    </Button>
                    {images && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  </div>

                  {mediaResult && (
                    <div className="mt-4 rounded-lg border border-border/60 p-3">
                      <div className="mb-2 text-sm font-medium">
                        Media: {mediaResult.type}
                      </div>
                      {mediaResult.url.endsWith(".mp4") ? (
                        <video
                          controls
                          src={mediaResult.url}
                          className="w-full max-w-2xl rounded-md"
                        />
                      ) : (
                        <img
                          src={mediaResult.url}
                          alt={mediaResult.type}
                          className="w-full max-w-2xl rounded-md"
                        />
                      )}
                      <div className="mt-2">
                        <a
                          href={mediaResult.url}
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
          </>
        )}

        {/* Lab Generation */}
        {activeTab === "lab" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Generate Lab Material</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateLab} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab_topic">Topic *</Label>
                    <Input
                      id="lab_topic"
                      value={labForm.topic}
                      onChange={(e) =>
                        setLabForm({ ...labForm, topic: e.target.value })
                      }
                      placeholder="e.g. BST insertion"
                      disabled={isGenerating}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language *</Label>
                    <Select
                      id="language"
                      value={labForm.language}
                      onChange={(e) =>
                        setLabForm({
                          ...labForm,
                          language: e.target.value as typeof labForm.language,
                        })
                      }
                      disabled={isGenerating}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button type="submit" disabled={isGenerating || !labForm.topic.trim()}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Lab
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {isGenerating && <SkeletonCard />}
            {labResult && !isGenerating && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Generated Lab Material</CardTitle>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {labResult.grounding_score && (
                          <Badge
                            variant={
                              labResult.grounding_score > 0.8
                                ? "default"
                                : labResult.grounding_score > 0.5
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            Grounding:{" "}
                            {(labResult.grounding_score * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {labResult.supported_languages &&
                          labResult.supported_languages.length > 0 && (
                            <Badge variant="outline">
                              Also available in:{" "}
                              {labResult.supported_languages.join(", ")}
                            </Badge>
                          )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(labResult.output)}
                      >
                        <Copy className="size-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap font-mono">
                    {labResult.output}
                  </pre>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
