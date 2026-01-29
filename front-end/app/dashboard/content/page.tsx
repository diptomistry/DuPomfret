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
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import {
    CourseComponent,
    CourseMaterial,
    uploadMaterial,
    listMaterials,
} from "@/lib/api";
import {
    Upload,
    FileText,
    ExternalLink,
    Loader2,
    FolderOpen,
    Calendar,
} from "lucide-react";

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
    const [type, setType] = useState<(typeof MATERIAL_TYPES)[number]>("slide");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true);
                const data = await listMaterials();
                setMaterials(data);
            } catch (err) {
                console.error(err);
                setError(
                    "Failed to load materials. Check backend connectivity.",
                );
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
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Header */}
                        <div className="page-header">
                            <h1 className="page-title">Course Materials</h1>
                            <p className="page-description">
                                Upload and organize your Theory and Lab files.
                            </p>
                        </div>

                        {/* Upload Form Card */}
                        <Card>
                            <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <Upload className="size-4 sm:size-5 text-primary" />
                                    Upload File
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Add new materials with metadata for better
                                    organization.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                                <form
                                    className="grid gap-3 sm:gap-4 md:grid-cols-2"
                                    onSubmit={handleUpload}
                                >
                                    <div className="space-y-2 md:col-span-2">
                                        <Label
                                            htmlFor="title"
                                            className="text-xs sm:text-sm"
                                        >
                                            Title
                                        </Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) =>
                                                setTitle(e.target.value)
                                            }
                                            placeholder="e.g. Week 3 – Sorting Algorithms"
                                            disabled={isLoading}
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="component"
                                            className="text-xs sm:text-sm"
                                        >
                                            Component
                                        </Label>
                                        <Select
                                            id="component"
                                            value={component}
                                            onChange={(e) =>
                                                setComponent(
                                                    e.target
                                                        .value as CourseComponent,
                                                )
                                            }
                                            disabled={isLoading}
                                        >
                                            <option value="theory">
                                                Theory
                                            </option>
                                            <option value="lab">Lab</option>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="type"
                                            className="text-xs sm:text-sm"
                                        >
                                            Type
                                        </Label>
                                        <Select
                                            id="type"
                                            value={type}
                                            onChange={(e) =>
                                                setType(
                                                    e.target
                                                        .value as (typeof MATERIAL_TYPES)[number],
                                                )
                                            }
                                            disabled={isLoading}
                                        >
                                            {MATERIAL_TYPES.map((t) => (
                                                <option key={t} value={t}>
                                                    {t.charAt(0).toUpperCase() +
                                                        t.slice(1)}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="week"
                                            className="text-xs sm:text-sm"
                                        >
                                            Week
                                        </Label>
                                        <Input
                                            id="week"
                                            type="number"
                                            min={1}
                                            value={week}
                                            onChange={(e) =>
                                                setWeek(e.target.value)
                                            }
                                            placeholder="e.g. 3"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="topic"
                                            className="text-xs sm:text-sm"
                                        >
                                            Topic
                                        </Label>
                                        <Input
                                            id="topic"
                                            value={topic}
                                            onChange={(e) =>
                                                setTopic(e.target.value)
                                            }
                                            placeholder="e.g. Divide and Conquer"
                                            disabled={isLoading}
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label
                                            htmlFor="tags"
                                            className="text-xs sm:text-sm"
                                        >
                                            Tags (comma-separated)
                                        </Label>
                                        <Input
                                            id="tags"
                                            value={tags}
                                            onChange={(e) =>
                                                setTags(e.target.value)
                                            }
                                            placeholder="e.g. sorting, complexity, merge-sort"
                                            disabled={isLoading}
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label
                                            htmlFor="file"
                                            className="text-xs sm:text-sm"
                                        >
                                            File
                                        </Label>
                                        <Input
                                            id="file"
                                            type="file"
                                            onChange={(e) =>
                                                setFile(
                                                    e.target.files
                                                        ? e.target.files[0]
                                                        : null,
                                                )
                                            }
                                            disabled={isLoading}
                                            className="text-sm file:mr-3 sm:file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 sm:file:px-4 file:py-1.5 sm:file:py-2 file:text-xs sm:file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                                        />
                                    </div>

                                    <div className="md:col-span-2 flex justify-end gap-2">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="gap-2 w-full sm:w-auto"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="size-4 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="size-4" />
                                                    Upload File
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>

                                {error && <ErrorState message={error} />}
                            </CardContent>
                        </Card>

                        {/* Materials List Card */}
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FolderOpen className="size-5 text-muted-foreground" />
                                    Existing Materials
                                    {materials.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-auto"
                                        >
                                            {materials.length} files
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading && materials.length === 0 ? (
                                    <SkeletonList count={3} />
                                ) : materials.length === 0 ? (
                                    <EmptyState
                                        icon={FileText}
                                        title="No materials yet"
                                        description="Upload your first lecture or lab file above to get started."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {materials.map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-medium text-sm">
                                                        {m.title}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={
                                                                m.component ===
                                                                "lab"
                                                                    ? "lab"
                                                                    : "theory"
                                                            }
                                                        >
                                                            {m.component}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {m.type}
                                                        </Badge>
                                                        {m.week && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="gap-1"
                                                            >
                                                                <Calendar className="size-3" />
                                                                Week {m.week}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    {m.topic && (
                                                        <span className="rounded-md bg-accent/50 px-2 py-0.5">
                                                            {m.topic}
                                                        </span>
                                                    )}
                                                    {m.tags &&
                                                        m.tags.length > 0 && (
                                                            <span className="flex flex-wrap gap-1">
                                                                {m.tags.map(
                                                                    (tag) => (
                                                                        <span
                                                                            key={
                                                                                tag
                                                                            }
                                                                            className="rounded-md bg-muted/60 px-2 py-0.5"
                                                                        >
                                                                            #
                                                                            {
                                                                                tag
                                                                            }
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </span>
                                                        )}
                                                    {m.url && (
                                                        <Button
                                                            asChild
                                                            size="xs"
                                                            variant="link"
                                                            className="ml-auto gap-1 px-0 text-xs text-primary"
                                                        >
                                                            <a
                                                                href={m.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <ExternalLink className="size-3" />
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
                </div>
            </AppShell>
        </div>
    );
}
