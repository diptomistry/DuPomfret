"use client";

import { useState, useRef, useEffect } from "react";
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
import { Select } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
    Upload,
    FileText,
    Download,
    Trash2,
    Loader2,
    Eye,
    Edit,
    Check,
    X,
    BookOpen,
    Sparkles,
    Image as ImageIcon,
    FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Note {
    id: string;
    created_by: string;
    course_id?: string;
    original_image_url: string;
    latex_output?: string;
    created_at: string;
}

interface Course {
    id: string;
    code: string;
    title: string;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [viewMode, setViewMode] = useState<"latex" | "original">("latex");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch courses on mount
    useEffect(() => {
        fetchCourses();
        fetchNotes();
    }, []);

    const fetchCourses = async () => {
        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) return;

            const response = await fetch("http://localhost:8000/courses", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    };

    const fetchNotes = async (courseId?: string) => {
        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                setError("Please log in to view notes");
                return;
            }

            const url = courseId
                ? `http://localhost:8000/notes/?course_id=${courseId}`
                : "http://localhost:8000/notes/";

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(data);
            } else {
                setError("Failed to fetch notes");
            }
        } catch (err) {
            console.error("Error fetching notes:", err);
            setError("Error fetching notes");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please upload an image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setUploadedImage(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadNote = async () => {
        if (!uploadedImage) {
            setError("Please upload an image");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("http://localhost:8000/notes/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    image_data: uploadedImage,
                    course_id: selectedCourse || null,
                }),
            });

            if (response.ok) {
                const newNote = await response.json();
                setNotes((prev) => [newNote, ...prev]);
                setUploadedImage(null);
                setSelectedCourse("");
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Failed to upload note");
            }
        } catch (err) {
            console.error("Error uploading note:", err);
            setError("Error uploading note");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) return;

            const response = await fetch(
                `http://localhost:8000/notes/${noteId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                },
            );

            if (response.ok) {
                setNotes((prev) => prev.filter((n) => n.id !== noteId));
                if (selectedNote?.id === noteId) {
                    setSelectedNote(null);
                }
            }
        } catch (err) {
            console.error("Error deleting note:", err);
            setError("Error deleting note");
        }
    };

    const handleDownloadImage = () => {
        if (!selectedNote) return;
        const link = document.createElement("a");
        link.href = selectedNote.original_image_url;
        link.download = `note-${selectedNote.id.substring(0, 8)}-original.png`;
        link.click();
    };

    const handleDownloadLatex = () => {
        if (!selectedNote?.latex_output) return;
        const blob = new Blob([selectedNote.latex_output], {
            type: "text/plain",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `note-${selectedNote.id.substring(0, 8)}.tex`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = async () => {
        if (!selectedNote?.latex_output) return;

        try {
            // Create a simple HTML page with the LaTeX as preformatted text
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Note ${selectedNote.id.substring(0, 8)}</title>
    <style>
        body { font-family: 'Courier New', monospace; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
        h1 { font-family: Arial, sans-serif; }
        pre { background: #f5f5f5; padding: 20px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <h1>Handwritten Note - LaTeX Code</h1>
    <p><small>Created: ${new Date(selectedNote.created_at).toLocaleDateString()}</small></p>
    <p><em>Copy this LaTeX code and compile it with a LaTeX editor (e.g., Overleaf, TeXworks) to generate a PDF.</em></p>
    <pre>${selectedNote.latex_output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `note-${selectedNote.id.substring(0, 8)}.html`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error creating download:", err);
            setError("Error creating download");
        }
    };

    return (
        <AppShell>
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Handwritten Notes Digitization
                    </h1>
                    <p className="text-muted-foreground">
                        Convert your handwritten class notes into beautifully
                        formatted digital documents with LaTeX support
                    </p>
                </div>

                {error && (
                    <Card className="mb-6 border-destructive">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-destructive">
                                <X className="size-5" />
                                <p>{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="size-5" />
                                Upload Handwritten Note
                            </CardTitle>
                            <CardDescription>
                                Upload an image of your handwritten notes to
                                digitize
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Course (Optional)
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    value={selectedCourse}
                                    onChange={(e) =>
                                        setSelectedCourse(e.target.value)
                                    }
                                >
                                    <option value="">Select a course</option>
                                    {courses.map((course) => (
                                        <option
                                            key={course.id}
                                            value={course.id}
                                        >
                                            {course.code} - {course.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Image *
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
                                >
                                    {uploadedImage ? (
                                        <div className="w-full">
                                            <img
                                                src={uploadedImage}
                                                alt="Uploaded"
                                                className="max-h-[300px] mx-auto rounded"
                                            />
                                            <p className="text-sm text-center mt-2 text-muted-foreground">
                                                Click to change image
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon className="size-12 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                Click to upload image
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>

                            <Button
                                onClick={handleUploadNote}
                                disabled={isUploading}
                                className="w-full"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 size-4" />
                                        Digitize Note
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notes List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="size-5" />
                                Your Notes
                            </CardTitle>
                            <CardDescription>
                                View and manage your digitized notes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {notes.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="size-12 mx-auto mb-3 opacity-50" />
                                        <p>
                                            No notes yet. Upload your first
                                            note!
                                        </p>
                                    </div>
                                ) : (
                                    notes.map((note) => (
                                        <div
                                            key={note.id}
                                            className={cn(
                                                "border rounded-lg p-4 transition-colors hover:border-primary",
                                                selectedNote?.id === note.id &&
                                                    "border-primary bg-primary/5",
                                            )}
                                        >
                                            <div
                                                className="cursor-pointer"
                                                onClick={() =>
                                                    setSelectedNote(note)
                                                }
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-semibold">
                                                            Note #
                                                            {note.id.substring(
                                                                0,
                                                                8,
                                                            )}
                                                        </h3>
                                                        {note.course_id && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Course:{" "}
                                                                {courses.find(
                                                                    (c) =>
                                                                        c.id ===
                                                                        note.course_id,
                                                                )?.code ||
                                                                    note.course_id.substring(
                                                                        0,
                                                                        8,
                                                                    )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        note.created_at,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 mt-3 pt-3 border-t">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() =>
                                                        setSelectedNote(note)
                                                    }
                                                >
                                                    <Eye className="size-3 mr-1" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNote(
                                                            note.id,
                                                        );
                                                    }}
                                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Note Viewer */}
                {selectedNote && (
                    <Card className="mt-6">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>
                                        Note #{selectedNote.id.substring(0, 8)}
                                    </CardTitle>
                                    <CardDescription>
                                        Created on{" "}
                                        {new Date(
                                            selectedNote.created_at,
                                        ).toLocaleDateString()}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewMode("latex")}
                                        className={cn(
                                            viewMode === "latex" &&
                                                "bg-primary text-primary-foreground",
                                        )}
                                    >
                                        LaTeX Code
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewMode("original")}
                                        className={cn(
                                            viewMode === "original" &&
                                                "bg-primary text-primary-foreground",
                                        )}
                                    >
                                        Original
                                    </Button>
                                    <div className="w-px h-6 bg-border" />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadImage}
                                        title="Download original image"
                                    >
                                        <ImageIcon className="size-4 mr-1" />
                                        Image
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadLatex}
                                        title="Download LaTeX code"
                                    >
                                        <FileDown className="size-4 mr-1" />
                                        .tex
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadPDF}
                                        title="Download as HTML (can be saved as PDF)"
                                    >
                                        <Download className="size-4 mr-1" />
                                        HTML
                                    </Button>
                                    <div className="w-px h-6 bg-border" />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            handleDeleteNote(selectedNote.id)
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {viewMode === "original" ? (
                                <div className="text-center bg-muted p-4 rounded">
                                    <img
                                        src={selectedNote.original_image_url}
                                        alt="Original handwritten note"
                                        className="max-w-full max-h-[800px] mx-auto rounded border shadow-lg"
                                    />
                                </div>
                            ) : (
                                <div className="bg-muted p-6 rounded font-mono text-sm overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">
                                        {selectedNote.latex_output ||
                                            "No LaTeX content"}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
