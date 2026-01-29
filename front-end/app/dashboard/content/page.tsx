"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ingestCourseContent,
  uploadFile,
  listCourses,
  listCourseContents,
  type Course,
  type CourseContent,
  type IngestRequest,
} from "@/lib/courses-api";
import { ROUTES } from "@/lib/constants";
import {
  FileText,
  ExternalLink,
  Loader2,
  FolderOpen,
  Calendar,
  FileUp,
  BookOpen,
  Upload,
  Filter,
  Shield,
  GraduationCap,
  ArrowRight,
  X,
  ChevronRight,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

const MATERIAL_TYPES = ["slide", "pdf", "code", "note", "image"] as const;
const CONTENT_TYPE_LABELS: Record<string, string> = {
  slide: "Lecture slides",
  pdf: "PDF",
  code: "Code file",
  note: "Notes / references",
  image: "Image",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function ContentPageInner() {
  const searchParams = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId");

  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const token = session?.access_token ?? null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courseIdFromUrl ?? "",
  );
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<
    "all" | "theory" | "lab"
  >("all");
  const [filterWeek, setFilterWeek] = useState<string>("");

  useEffect(() => {
    if (courseIdFromUrl && courseIdFromUrl !== selectedCourseId) {
      setSelectedCourseId(courseIdFromUrl);
    }
  }, [courseIdFromUrl]);

  useEffect(() => {
    if (!token) {
      setError("Not signed in.");
      return;
    }
    let cancelled = false;
    listCourses(token)
      .then((data) => {
        if (!cancelled) {
          setCourses(data);
          if (!selectedCourseId && data.length > 0 && !courseIdFromUrl) {
            setSelectedCourseId(data[0].id);
          }
          if (courseIdFromUrl && data.some((c) => c.id === courseIdFromUrl)) {
            setSelectedCourseId(courseIdFromUrl);
          }
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load courses.",
          );
      })
      .finally(() => {
        if (!cancelled) setCoursesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadContents = useCallback(() => {
    if (!token || !selectedCourseId) {
      setContents([]);
      return;
    }
    setContentsLoading(true);
    setError(null);
    const params: { category?: string; week?: number } = {};
    if (filterCategory !== "all") params.category = filterCategory;
    if (filterWeek) params.week = parseInt(filterWeek, 10);
    listCourseContents(token, selectedCourseId, params)
      .then(setContents)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load materials.",
        ),
      )
      .finally(() => setContentsLoading(false));
  }, [token, selectedCourseId, filterCategory, filterWeek]);

  useEffect(() => {
    if (!token || !selectedCourseId) return;
    loadContents();
  }, [token, selectedCourseId, filterCategory, filterWeek, loadContents]);

  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<"upload-or-url" | "metadata">(
    "upload-or-url",
  );
  const [uploadFileInput, setUploadFileInput] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestCategory, setIngestCategory] = useState<"theory" | "lab">(
    "theory",
  );
  const [ingestContentType, setIngestContentType] = useState("pdf");
  const [ingestFileUrl, setIngestFileUrl] = useState("");
  const [ingestWeek, setIngestWeek] = useState("");
  const [ingestTopic, setIngestTopic] = useState("");
  const [ingestTags, setIngestTags] = useState("");
  const [ingestLanguage, setIngestLanguage] = useState("");
  const [ingestSubmitting, setIngestSubmitting] = useState(false);

  function openAddMaterial() {
    setAddOpen(true);
    setAddStep("upload-or-url");
    setIngestFileUrl("");
    setUploadFileInput(null);
    setIngestTitle("");
    setIngestCategory("theory");
    setIngestContentType("pdf");
    setIngestWeek("");
    setIngestTopic("");
    setIngestTags("");
    setIngestLanguage("");
  }

  function closeAddMaterial() {
    setAddOpen(false);
    setAddStep("upload-or-url");
    setIngestFileUrl("");
    setUploadFileInput(null);
  }

  async function handleUploadThenMetadata() {
    if (!token || !uploadFileInput) return;
    setUploading(true);
    setError(null);
    const ext = uploadFileInput.name.split(".").pop()?.toLowerCase() ?? "";
    const fileTypeMap: Record<string, string> = {
      // documents
      pdf: "pdf",
      doc: "note",
      docx: "note",
      txt: "note",
      md: "note",
      // slides
      ppt: "slide",
      pptx: "slide",
      odp: "slide",
      // images
      png: "image",
      jpg: "image",
      jpeg: "image",
      gif: "image",
      webp: "image",
      // common code file extensions -> treat as code
      py: "code",
      js: "code",
      ts: "code",
      java: "code",
      c: "code",
      cpp: "code",
      h: "code",
      cs: "code",
      rb: "code",
      go: "code",
      rs: "code",
      swift: "code",
      kt: "code",
      php: "code",
      // notebooks and archives
      ipynb: "code",
      zip: "code",
      // fallback
    };
    const fileType = fileTypeMap[ext] ?? "pdf";
    try {
      const result = await uploadFile(
        token,
        uploadFileInput,
        fileType,
        "course-content",
      );
      setIngestFileUrl(result.url);
      setIngestContentType(fileType);
      if (!ingestTitle.trim())
        setIngestTitle(uploadFileInput.name.replace(/\.[^.]+$/, ""));
      setAddStep("metadata");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedCourseId || !ingestFileUrl.trim()) return;
    setIngestSubmitting(true);
    setError(null);
    const body: IngestRequest = {
      course_id: selectedCourseId,
      category: ingestCategory,
      content_type: ingestContentType,
      file_url: ingestFileUrl.trim(),
    };
    if (ingestTitle.trim()) body.title = ingestTitle.trim();
    if (ingestTopic.trim()) body.topic = ingestTopic.trim();
    if (ingestWeek) body.week = parseInt(ingestWeek, 10);
    if (ingestTags.trim())
      body.tags = ingestTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    if (ingestLanguage.trim()) body.language = ingestLanguage.trim();
    try {
      await ingestCourseContent(token, body);
      closeAddMaterial();
      // refresh current list (bypass cache by re-loading)
      await loadContents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add material.");
    } finally {
      setIngestSubmitting(false);
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);
  const [codeText, setCodeText] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  function openViewer(content: CourseContent) {
    setSelectedContent(content);
    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
    setSelectedContent(null);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadCode() {
      setCodeText(null);
      setCodeError(null);
      if (!selectedContent || selectedContent.content_type !== "code" || !selectedContent.file_url) {
        return;
      }
      setCodeLoading(true);
      try {
        const res = await fetch(selectedContent.file_url);
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
        const ct = res.headers.get("content-type") || "";
        const urlLower = (selectedContent.file_url || "").toLowerCase();
        if (urlLower.endsWith(".ipynb") || ct.includes("application/json")) {
          const json = await res.json();
          const cells = json?.cells ?? [];
          const parts: string[] = [];
          for (const cell of cells) {
            if (cell.cell_type === "markdown") {
              parts.push("// MARKDOWN\n" + (cell.source || []).join(""));
            } else if (cell.cell_type === "code") {
              parts.push((cell.source || []).join(""));
            }
          }
          if (!cancelled) setCodeText(parts.join("\n\n// ---\n\n"));
        } else {
          const text = await res.text();
          if (!cancelled) setCodeText(text);
        }
      } catch (err: any) {
        if (!cancelled) setCodeError(err?.message || String(err));
      } finally {
        if (!cancelled) setCodeLoading(false);
      }
    }
    loadCode();
    return () => {
      cancelled = true;
    };
  }, [selectedContent]);
 
  function inferLanguage(): string | undefined {
    if (selectedContent?.language) return selectedContent.language;
    const url = selectedContent?.file_url ?? "";
    const ext = url.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      java: "java",
      c: "c",
      cpp: "cpp",
      go: "go",
      rs: "rust",
      html: "html",
      css: "css",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
      json: "json",
      ipynb: "python",
      sh: "bash",
    };
    return map[ext] ?? undefined;
  }

  return (
    <div className="min-h-svh">
      <Navbar />
      <AppShell>
        <div className="page-shell">
          <div className="page-stack">
            {/* Header — organized toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <FolderOpen className="size-6 shrink-0 text-primary sm:size-7" />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">
                    Course Materials
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : "Select a course"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={ROUTES.DASHBOARD_COURSES}>
                    <BookOpen className="size-4 mr-1" />
                    All courses
                  </Link>
                </Button>

                {/* course selector */}
                {!coursesLoading ? (
                  <select
                    className={selectClass + " w-full min-w-0 sm:w-auto sm:min-w-[220px] shrink-0"}
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    disabled={!token || courses.length === 0}
                    aria-label="Select course"
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                )}

                {/* Filters (visible on sm+) */}
                {selectedCourseId && (
                  <div className="hidden sm:flex items-center gap-2">
                    <select
                      className={selectClass + " w-auto min-w-[140px] text-xs py-1.5 h-8"}
                      value={filterCategory}
                      onChange={(e) =>
                        setFilterCategory(e.target.value as "all" | "theory" | "lab")
                      }
                      aria-label="Filter category"
                    >
                      <option value="all">All</option>
                      <option value="theory">Theory</option>
                      <option value="lab">Lab</option>
                    </select>
                    <select
                      className={selectClass + " w-auto min-w-[120px] text-xs py-1.5 h-8"}
                      value={filterWeek}
                      onChange={(e) => setFilterWeek(e.target.value)}
                      aria-label="Filter week"
                    >
                      <option value="">All weeks</option>
                      {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={String(w)}>
                          Week {w}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Actions */}
                  <div className="flex items-center gap-2">
                    {role === "admin" && selectedCourseId && (
                      <Button size="sm" onClick={openAddMaterial} className="gap-1 shrink-0">
                        <Upload className="size-4" />
                        Add material
                      </Button>
                    )}
                  </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* When upload or viewer open: collapse list left, panel on right */}
            <div
              className={
                (addOpen && role === "admin") || viewerOpen
                  ? "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-6"
                  : "space-y-4"
              }
            >
              {/* Materials list — collapsed width when upload is open */}
              <Card
                className={
                  (addOpen && role === "admin") || viewerOpen
                    ? "overflow-hidden border border-border/80 bg-card/80 backdrop-blur-sm min-w-0 lg:max-w-[360px] lg:max-h-[calc(100vh-12rem)] lg:flex lg:flex-col"
                    : "overflow-hidden border border-border/80 bg-card/80 backdrop-blur-sm"
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base font-semibold min-w-0">
                      {selectedCourseId ? (
                        <>
                          {selectedCourse?.code ?? "Course"} · {contents.length}{" "}
                          file
                          {contents.length !== 1 ? "s" : ""}
                        </>
                      ) : (
                        "Select a course above"
                      )}
                    </CardTitle>
                    {/* Filters moved to the header for easier access */}
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3 overflow-auto max-h-[60vh] lg:max-h-[calc(100vh-12rem)] pr-2">
                  {!selectedCourseId ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No course selected"
                      description="Choose a course from the dropdown above or open one from the Courses page."
                    />
                  ) : contentsLoading && contents.length === 0 ? (
                    <SkeletonList count={4} />
                  ) : contents.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No materials yet"
                      description={
                        role === "admin"
                          ? "Use Add material to upload or link content (slides, PDFs, code, notes)."
                          : "No content has been added to this course yet."
                      }
                    />
                  ) : (
                    <ul className="space-y-3">
                      {contents.map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-all duration-200 hover:bg-muted/40 hover:border-border/80"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-sm text-foreground">
                              {m.title}
                            </span>
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant={m.category === "lab" ? "lab" : "theory"}
                              >
                                {m.category}
                              </Badge>
                              <Badge variant="outline" className="font-normal">
                                {CONTENT_TYPE_LABELS[m.content_type] ??
                                  m.content_type}
                              </Badge>
                              {m.week != null && (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 font-normal"
                                >
                                  <Calendar className="size-3" />
                                  Week {m.week}
                                </Badge>
                              )}
                              {/* View button aligned with badges for consistent header placement */}
                              {m.file_url && (
                                <div className="ml-3 flex items-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openViewer(m)}
                                    className="inline-flex items-center gap-2 text-xs h-8 px-3"
                                    aria-label={`View ${m.title}`}
                                  >
                                    <Eye className="size-4" />
                                    <span className="hidden sm:inline">View</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {m.topic && (
                              <span className="rounded-md bg-accent/50 px-2 py-0.5 text-accent-foreground">
                                {m.topic}
                              </span>
                            )}
                            {m.tags && m.tags.length > 0 && (
                              <span className="flex flex-wrap gap-1">
                                {m.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-md bg-muted/60 px-2 py-0.5"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </span>
                            )}
                            {/* file_url actions moved to the header badges area for consistent alignment */}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              {/* Viewer panel — opens on the right when an item is selected */}
              {viewerOpen && selectedContent && (
                <Card className="overflow-hidden border border-border/80 bg-card/80 lg:max-h-[calc(100vh-12rem)]">
                  <CardHeader className="flex items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold truncate">
                      {selectedContent.title}
                    </CardTitle>
                  </CardHeader>
                  {/* Close button absolutely positioned */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeViewer}
                    aria-label="Close"
                    className="absolute right-4 top-4 z-20"
                  >
                    <X className="size-4" />
                  </Button>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={selectedContent.category === "lab" ? "lab" : "theory"}
                        >
                          {selectedContent.category}
                        </Badge>
                        <Badge variant="outline">
                          {CONTENT_TYPE_LABELS[selectedContent.content_type] ?? selectedContent.content_type}
                        </Badge>
                        {selectedContent.week != null && (
                          <Badge variant="secondary">Week {selectedContent.week}</Badge>
                        )}
                      </div>
                      {selectedContent.file_url ? (
                        selectedContent.content_type === "pdf" || selectedContent.content_type === "slide" ? (
                          <div className="h-[70vh]">
                            <iframe src={selectedContent.file_url} className="w-full h-full border-0" title={selectedContent.title} />
                          </div>
                        ) : selectedContent.content_type === "code" ? (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Language:</span>
                                <Badge variant="outline">{selectedContent.language ?? "code"}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (codeText) {
                                      await navigator.clipboard.writeText(codeText);
                                    }
                                  }}
                                  disabled={!codeText}
                                >
                                  Copy
                                </Button>
                              </div>
                            </div>

                            <div className="h-[60vh] overflow-auto rounded border border-border/60 bg-muted/5 p-3">
                              {codeLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="size-4 animate-spin" />
                                  Loading file…
                                </div>
                              ) : codeError ? (
                                <div className="text-sm text-destructive">{codeError}</div>
                              ) : codeText ? (
                                <SyntaxHighlighter
                                  language={inferLanguage()}
                                  style={atomOneLight}
                                  showLineNumbers
                                  wrapLongLines
                                  customStyle={{ margin: 0, background: "transparent", fontSize: 13 }}
                                >
                                  {codeText}
                                </SyntaxHighlighter>
                              ) : (
                                <div className="text-sm text-muted-foreground">Unable to preview this file.</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground">{selectedContent.title}</p>
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">No file URL available for this item.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add material — dashboard-style bordered card */}
              {addOpen && role === "admin" && (
                <Card className="relative overflow-hidden border-2 border-primary/30 bg-linear-to-br from-blue-500/5 via-cyan-500/5 to-primary/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-primary/10">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-linear-to-br from-blue-500 to-cyan-400 p-2">
                        <Upload className="size-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          {addStep === "upload-or-url"
                            ? "Step 1 — Upload or link"
                            : "Step 2 — Metadata"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {addStep === "upload-or-url"
                            ? "Upload a file or paste a public URL"
                            : "Add title, category, and optional metadata"}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeAddMaterial}
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {addStep === "upload-or-url" ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Course:{" "}
                          <strong className="text-foreground">
                            {selectedCourse?.code ?? selectedCourseId}
                          </strong>
                        </p>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Upload file
                          </Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.ppt,.pptx,.odp,.doc,.docx,.txt,.md,.py,.js,.ts,.java,.c,.cpp,.h,.cs,.rb,.go,.rs,.swift,.kt,.php,.ipynb,.zip,.png,.jpg,.jpeg,.gif,.webp"
                              onChange={(e) =>
                                setUploadFileInput(e.target.files?.[0] ?? null)
                              }
                              className="max-w-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!uploadFileInput || uploading}
                              onClick={handleUploadThenMetadata}
                            >
                              {uploading ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Upload & continue"
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="relative flex items-center gap-2 py-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">
                            or paste URL
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="add-url"
                            className="text-sm font-medium"
                          >
                            File URL
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="add-url"
                              placeholder="https://…"
                              value={ingestFileUrl}
                              onChange={(e) => setIngestFileUrl(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={!ingestFileUrl.trim()}
                              onClick={() => setAddStep("metadata")}
                              className="gap-1"
                            >
                              Continue
                              <ChevronRight className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleIngest} className="space-y-4">
                        <p className="text-xs text-muted-foreground truncate">
                          File: {ingestFileUrl.slice(0, 60)}…
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label
                              htmlFor="ingest-title"
                              className="text-sm font-medium"
                            >
                              Title
                            </Label>
                            <Input
                              id="ingest-title"
                              placeholder="e.g. Week 3 — Sorting Algorithms"
                              value={ingestTitle}
                              onChange={(e) => setIngestTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="ingest-category"
                                className="text-sm font-medium"
                              >
                                Category
                              </Label>
                              <select
                                id="ingest-category"
                                className={selectClass}
                                value={ingestCategory}
                                onChange={(e) =>
                                  setIngestCategory(
                                    e.target.value as "theory" | "lab",
                                  )
                                }
                              >
                                <option value="theory">Theory</option>
                                <option value="lab">Lab</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="ingest-type"
                                className="text-sm font-medium"
                              >
                                Content type
                              </Label>
                              <select
                                id="ingest-type"
                                className={selectClass}
                                value={ingestContentType}
                                onChange={(e) =>
                                  setIngestContentType(e.target.value)
                                }
                              >
                                {MATERIAL_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {CONTENT_TYPE_LABELS[t] ?? t}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="ingest-week"
                                className="text-sm font-medium"
                              >
                                Week (optional)
                              </Label>
                              <Input
                                id="ingest-week"
                                type="number"
                                min={1}
                                placeholder="e.g. 3"
                                value={ingestWeek}
                                onChange={(e) => setIngestWeek(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="ingest-topic"
                                className="text-sm font-medium"
                              >
                                Topic (optional)
                              </Label>
                              <Input
                                id="ingest-topic"
                                placeholder="e.g. AVL Tree"
                                value={ingestTopic}
                                onChange={(e) => setIngestTopic(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label
                              htmlFor="ingest-tags"
                              className="text-sm font-medium"
                            >
                              Tags (comma-separated, optional)
                            </Label>
                            <Input
                              id="ingest-tags"
                              placeholder="e.g. sorting, complexity, merge-sort"
                              value={ingestTags}
                              onChange={(e) => setIngestTags(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label
                              htmlFor="ingest-lang"
                              className="text-sm font-medium"
                            >
                              Language (optional, for code)
                            </Label>
                            <Input
                              id="ingest-lang"
                              placeholder="e.g. python"
                              value={ingestLanguage}
                              onChange={(e) =>
                                setIngestLanguage(e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAddStep("upload-or-url")}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={ingestSubmitting}
                            size="sm"
                            className="gap-1"
                          >
                            {ingestSubmitting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <>
                                Add material
                                <ArrowRight className="size-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </div>
  );
}

export default function ContentPage() {
  // Next.js requires useSearchParams() to be inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ContentPageInner />
    </Suspense>
  );
}
