"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import {
  listCourses,
  createCourse,
  ingestCourseContent,
  type Course,
  type IngestRequest,
} from "@/lib/courses-api";
import { ROUTES } from "@/lib/constants";
import {
  BookOpen,
  Plus,
  Loader2,
  ArrowRight,
  Shield,
  GraduationCap,
  FileUp,
} from "lucide-react";

export default function CoursesPage() {
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.role);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create course (admin)
  const [createOpen, setCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Ingest (admin)
  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestCourseId, setIngestCourseId] = useState("");
  const [ingestCategory, setIngestCategory] = useState<"theory" | "lab">("theory");
  const [ingestContentType, setIngestContentType] = useState("pdf");
  const [ingestFileUrl, setIngestFileUrl] = useState("");
  const [ingestTopic, setIngestTopic] = useState("");
  const [ingestSubmitting, setIngestSubmitting] = useState(false);

  const token = session?.access_token ?? null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Not signed in.");
      return;
    }
    let cancelled = false;
    listCourses(token)
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load courses.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !createCode.trim() || !createTitle.trim()) return;
    setCreateSubmitting(true);
    setError(null);
    try {
      const created = await createCourse(token, {
        code: createCode.trim(),
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
      });
      setCourses((prev) => [...prev, created]);
      setCreateCode("");
      setCreateTitle("");
      setCreateDesc("");
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !ingestCourseId.trim() || !ingestFileUrl.trim()) return;
    setIngestSubmitting(true);
    setError(null);
    const body: IngestRequest = {
      course_id: ingestCourseId.trim(),
      category: ingestCategory,
      content_type: ingestContentType,
      file_url: ingestFileUrl.trim(),
    };
    if (ingestTopic.trim()) body.topic = ingestTopic.trim();
    try {
      await ingestCourseContent(token, body);
      setIngestFileUrl("");
      setIngestTopic("");
      setIngestOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ingest content.");
    } finally {
      setIngestSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh">
      <Navbar />
      <AppShell>
        <div className="page-shell">
          <div className="page-stack">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
                  <BookOpen className="size-7 text-primary" />
                  Courses
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {role === "admin"
                    ? "Manage courses and ingest content. Students can browse and use course materials."
                    : "Browse your courses and open materials, search, and chat."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={role === "admin" ? "primary" : "default"} className="gap-1">
                  {role === "admin" ? (
                    <Shield className="size-3" />
                  ) : (
                    <GraduationCap className="size-3" />
                  )}
                  {role === "admin" ? "Admin" : "Student"}
                </Badge>
                {role === "admin" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4 mr-1" />
                      New course
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIngestOpen(true)}>
                      <FileUp className="size-4 mr-1" />
                      Ingest
                    </Button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Loading courses…
              </div>
            ) : courses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No courses yet.</p>
                  {role === "admin" && (
                    <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4 mr-2" />
                      Create first course
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className="group relative overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold">{course.code}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.title}
                      </CardDescription>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="default" className="gap-1">
                        <Link href={`${ROUTES.DASHBOARD_CONTENT}?courseId=${course.id}`}>
                          Materials
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link href={`${ROUTES.DASHBOARD_SEARCH}?courseId=${course.id}`}>
                          Search
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link href={`${ROUTES.DASHBOARD_CHAT}?courseId=${course.id}`}>
                          Chat
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Admin: Create course modal */}
            {createOpen && (
              <Card className="border-2 border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Create course</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div>
                      <Label htmlFor="code">Code</Label>
                      <Input
                        id="code"
                        placeholder="e.g. CSE220"
                        value={createCode}
                        onChange={(e) => setCreateCode(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Data Structures"
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc">Description (optional)</Label>
                      <Input
                        id="desc"
                        placeholder="Brief description"
                        value={createDesc}
                        onChange={(e) => setCreateDesc(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={createSubmitting}>
                      {createSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Admin: Ingest content */}
            {ingestOpen && (
              <Card className="border-2 border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ingest course content</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIngestOpen(false)}>
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleIngest} className="space-y-4">
                    <div>
                      <Label htmlFor="ingest-course">Course ID</Label>
                      <Input
                        id="ingest-course"
                        placeholder="Course UUID"
                        value={ingestCourseId}
                        onChange={(e) => setIngestCourseId(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use a course ID from the list above.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ingest-category">Category</Label>
                        <select
                          id="ingest-category"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          value={ingestCategory}
                          onChange={(e) =>
                            setIngestCategory(e.target.value as "theory" | "lab")
                          }
                        >
                          <option value="theory">Theory</option>
                          <option value="lab">Lab</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="ingest-type">Content type</Label>
                        <select
                          id="ingest-type"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          value={ingestContentType}
                          onChange={(e) => setIngestContentType(e.target.value)}
                        >
                          <option value="slide">Slide</option>
                          <option value="pdf">PDF</option>
                          <option value="code">Code</option>
                          <option value="note">Note</option>
                          <option value="image">Image</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="ingest-url">File URL</Label>
                      <Input
                        id="ingest-url"
                        placeholder="https://…"
                        value={ingestFileUrl}
                        onChange={(e) => setIngestFileUrl(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ingest-topic">Topic (optional)</Label>
                      <Input
                        id="ingest-topic"
                        placeholder="e.g. AVL Tree"
                        value={ingestTopic}
                        onChange={(e) => setIngestTopic(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={ingestSubmitting}>
                      {ingestSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Ingest"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </AppShell>
    </div>
  );
}
