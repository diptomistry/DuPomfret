"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseComponent, CourseMaterial, uploadMaterial, listMaterials } from "@/lib/api";

const MATERIAL_TYPES = ["slide", "pdf", "code", "note", "other"] as const;

export default function ContentPage() {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [component, setComponent] = useState<CourseComponent>("theory");
  const [week, setWeek] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] =
    useState<(typeof MATERIAL_TYPES)[number]>("slide");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await listMaterials();
        setMaterials(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load materials. Check backend connectivity.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) {
      setError("Title and file are required.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("component", component);
    if (week) formData.append("week", week);
    if (topic) formData.append("topic", topic);
    if (tags) formData.append("tags", tags);
    formData.append("type", type);

    try {
      setIsLoading(true);
      const created = await uploadMaterial(formData);
      setMaterials((prev) => [created, ...prev]);
      setTitle("");
      setWeek("");
      setTopic("");
      setTags("");
      setFile(null);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please verify the backend API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Course Content CMS
            </h1>
            <p className="text-muted-foreground text-sm">
              Upload and organize Theory and Lab materials with rich metadata.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={handleUpload}
              >
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Week 3 – Sorting Algorithms"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Component</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={component}
                    onChange={(e) =>
                      setComponent(e.target.value as CourseComponent)
                    }
                  >
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as (typeof MATERIAL_TYPES)[number])
                    }
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Week</label>
                  <Input
                    type="number"
                    min={1}
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Topic</label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Divide and Conquer"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">
                    Tags (comma-separated)
                  </label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. sorting, complexity, merge-sort"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">File</label>
                  <Input
                    type="file"
                    onChange={(e) =>
                      setFile(e.target.files ? e.target.files[0] : null)
                    }
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Uploading..." : "Upload material"}
                  </Button>
                </div>
              </form>
              {error && (
                <p className="text-sm text-destructive" aria-live="polite">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading materials...
                </p>
              ) : materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No materials yet. Upload your first lecture or lab file above.
                </p>
              ) : (
                <div className="space-y-3">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{m.title}</span>
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] uppercase">
                            {m.component}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase">
                            {m.type}
                          </span>
                          {m.week && <span>Week {m.week}</span>}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {m.topic && <span>{m.topic}</span>}
                        {m.tags && m.tags.length > 0 && (
                          <span className="flex flex-wrap gap-1">
                            {m.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-1.5 py-0.5"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        )}
                        {m.url && (
                          <Button
                            asChild
                            size="xs"
                            variant="link"
                            className="px-0 text-xs"
                          >
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open file
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

