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
import {
    MessageCircle,
    Send,
    Loader2,
    User,
    Bot,
    FileText,
    BookOpen,
    Code,
    Image as ImageIcon,
    ExternalLink,
    Sparkles,
    Paperclip,
    X,
    PlusCircle,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Source {
    content: string;
    metadata: {
        type: string;
        source: string;
        url: string | null;
        category?: string;
        topic?: string;
        language?: string;
    };
    similarity?: number;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    images?: string[]; // Array of image URLs or base64 strings
    createdAt: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
    backendSessionId?: string; // Session ID from backend API
    courseId?: string; // Course ID associated with this session
}

interface Course {
    id: string;
    code: string;
    title: string;
    description?: string;
}

export default function ChatPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(
        null,
    );
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSources, setSelectedSources] = useState<Source[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseId, setCourseId] = useState<string>("");
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get current session and messages
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    const messages = currentSession?.messages || [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load sessions from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("chatSessions");
        if (saved) {
            const loadedSessions = JSON.parse(saved);
            setSessions(loadedSessions);
            if (loadedSessions.length > 0) {
                setCurrentSessionId(loadedSessions[0].id);
            }
        } else {
            // Create initial session
            createNewSession();
        }

        // Fetch available courses
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                console.error("Not authenticated");
                return;
            }

            const apiUrl =
                process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/courses`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCourses(data);
                // Set first course as default
                if (data.length > 0) {
                    setCourseId(data[0].id);
                }
            } else {
                console.error("Failed to fetch courses:", response.status);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    };

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem("chatSessions", JSON.stringify(sessions));
        }
    }, [sessions]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const createNewSession = () => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: "New Chat",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            backendSessionId: undefined, // Will be created when first message is sent
            courseId: courseId || undefined,
        };
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
    };

    const deleteSession = (sessionId: string) => {
        setSessions((prev) => {
            const filtered = prev.filter((s) => s.id !== sessionId);
            if (filtered.length === 0) {
                createNewSession();
                return filtered;
            }
            if (sessionId === currentSessionId) {
                setCurrentSessionId(filtered[0].id);
            }
            return filtered;
        });
    };

    const updateSessionTitle = (sessionId: string, firstMessage: string) => {
        setSessions((prev) =>
            prev.map((s) =>
                s.id === sessionId
                    ? {
                          ...s,
                          title: firstMessage.slice(0, 50),
                          updatedAt: new Date().toISOString(),
                      }
                    : s,
            ),
        );
    };

    const addMessageToSession = (sessionId: string, message: Message) => {
        setSessions((prev) =>
            prev.map((s) =>
                s.id === sessionId
                    ? {
                          ...s,
                          messages: [...s.messages, message],
                          updatedAt: new Date().toISOString(),
                      }
                    : s,
            ),
        );
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    setUploadedImages((prev) => [...prev, base64]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    };

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const content = input.trim();
        if (!content && uploadedImages.length === 0) return;

        if (!courseId) {
            setError("Please select a course first.");
            return;
        }

        setInput("");
        const imagesToSend = [...uploadedImages];
        setUploadedImages([]);
        setError(null);

        // Ensure we have a local session
        let sessionId = currentSessionId;
        let localSession = sessions.find((s) => s.id === sessionId);

        if (!sessionId || !localSession) {
            const newSession: ChatSession = {
                id: crypto.randomUUID(),
                title: "New Chat",
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                backendSessionId: undefined,
                courseId: courseId,
            };
            setSessions((prev) => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            sessionId = newSession.id;
            localSession = newSession;
        }

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content,
            images: imagesToSend,
            createdAt: new Date().toISOString(),
        };

        addMessageToSession(sessionId, userMessage);

        // Update session title if it's the first message
        if (messages.length === 0 && content) {
            updateSessionTitle(sessionId, content);
        }
        setIsSending(true);

        try {
            // Get auth token
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                throw new Error("Not authenticated. Please log in.");
            }

            const apiUrl =
                process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

            // Check if we need to create a backend session
            let backendSessionId = localSession?.backendSessionId;

            // Create backend session if not exists or if course changed
            if (!backendSessionId || localSession?.courseId !== courseId) {
                console.log(
                    "Creating new backend chat session for course:",
                    courseId,
                );

                const sessionResponse = await fetch(`${apiUrl}/chat/session`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        course_id: courseId,
                    }),
                });

                if (!sessionResponse.ok) {
                    const errorData = await sessionResponse
                        .json()
                        .catch(() => null);
                    throw new Error(
                        errorData?.detail ||
                            `Failed to create chat session: ${sessionResponse.status}`,
                    );
                }

                const sessionData = await sessionResponse.json();
                backendSessionId = sessionData.id;

                // Update the local session with backend session ID and course ID
                setSessions((prev) =>
                    prev.map((s) =>
                        s.id === sessionId
                            ? {
                                  ...s,
                                  backendSessionId: backendSessionId,
                                  courseId: courseId,
                                  updatedAt: new Date().toISOString(),
                              }
                            : s,
                    ),
                );

                console.log("Backend session created:", backendSessionId);
            }

            console.log(
                "Sending message to backend session:",
                backendSessionId,
            );
            console.log("Message:", content || "Analyze these images");

            // Send message to chat endpoint
            const response = await fetch(`${apiUrl}/chat/${backendSessionId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    message: content || "Analyze these images",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage =
                    errorData?.detail ||
                    `API error: ${response.status} ${response.statusText}`;
                console.error("API Error Details:", {
                    status: response.status,
                    statusText: response.statusText,
                    errorData,
                });
                throw new Error(errorMessage);
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.answer,
                sources: data.sources || [],
                createdAt: new Date().toISOString(),
            };

            addMessageToSession(sessionId, assistantMessage);

            if (data.sources && data.sources.length > 0) {
                setSelectedSources(data.sources);
            }
        } catch (err) {
            console.error("Chat error:", err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to get response. Please try again.";
            setError(errorMessage);
        } finally {
            setIsSending(false);
        }
    }

    const getSourceIcon = (type: string) => {
        switch (type) {
            case "slide":
            case "pdf":
                return FileText;
            case "code":
                return Code;
            case "image":
                return ImageIcon;
            default:
                return BookOpen;
        }
    };

    const getSourceColor = (category?: string) => {
        switch (category) {
            case "theory":
                return "from-blue-500 to-cyan-400";
            case "lab":
                return "from-emerald-500 to-teal-400";
            default:
                return "from-violet-500 to-purple-400";
        }
    };

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Header */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                                AI Tutor Chat
                            </h1>
                            <p className="text-sm text-muted-foreground sm:text-base max-w-2xl">
                                Ask questions about your course materials and
                                get AI-powered answers with source references
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2 items-center">
                                <Badge variant="primary" className="gap-1">
                                    <Sparkles className="size-3" />
                                    RAG-Powered
                                </Badge>
                                <Badge variant="default" className="gap-1">
                                    <FileText className="size-3" />
                                    Source Grounded
                                </Badge>

                                {/* Course Selection */}
                                <div className="flex items-center gap-2 ml-auto">
                                    <label className="text-xs text-muted-foreground">
                                        Course:
                                    </label>
                                    <Select
                                        value={courseId}
                                        onChange={(e) =>
                                            setCourseId(e.target.value)
                                        }
                                        className="h-8 w-64 text-xs"
                                    >
                                        {courses.length === 0 ? (
                                            <option value="" disabled>
                                                No courses available
                                            </option>
                                        ) : (
                                            courses.map((course) => (
                                                <option
                                                    key={course.id}
                                                    value={course.id}
                                                >
                                                    {course.code} -{" "}
                                                    {course.title}
                                                </option>
                                            ))
                                        )}
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid - 3 Column Layout */}
                        <div className="grid gap-4 lg:grid-cols-[280px,1fr,380px] xl:grid-cols-[300px,1fr,420px]">
                            {/* Chat History Sidebar */}
                            <Card className="border-2 max-h-[600px] flex flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/40 pb-4">
                                    <Button
                                        onClick={createNewSession}
                                        className="w-full gap-2"
                                        size="sm"
                                    >
                                        <PlusCircle className="size-4" />
                                        New Chat
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-2 space-y-1">
                                    {sessions.length === 0 ? (
                                        <div className="text-center py-8 text-sm text-muted-foreground">
                                            No chats yet
                                        </div>
                                    ) : (
                                        sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className={cn(
                                                    "group flex items-center gap-2 rounded-lg p-3 cursor-pointer transition-colors",
                                                    session.id ===
                                                        currentSessionId
                                                        ? "bg-primary/10 border border-primary/30"
                                                        : "hover:bg-muted border border-transparent",
                                                )}
                                                onClick={() =>
                                                    setCurrentSessionId(
                                                        session.id,
                                                    )
                                                }
                                            >
                                                <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {session.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            session.messages
                                                                .length
                                                        }{" "}
                                                        messages
                                                    </p>
                                                </div>
                                                {sessions.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6 opacity-0 group-hover:opacity-100 shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteSession(
                                                                session.id,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="size-3 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            {/* Chat Card */}
                            <Card className="flex min-h-[600px] flex-col overflow-hidden border-2">
                                <CardHeader className="border-b border-border/40 pb-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageCircle className="size-5 text-primary" />
                                        Conversation
                                    </CardTitle>
                                    <CardDescription>
                                        Ask about concepts, slides, labs, or any
                                        course content
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col gap-0 p-0">
                                    {/* Messages Area */}
                                    <div className="flex-1 space-y-4 overflow-auto p-4 md:p-6">
                                        {messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                                <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                                    <MessageCircle className="size-8 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-2">
                                                        Start a conversation
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground max-w-md">
                                                        Ask questions like:
                                                    </p>
                                                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                                        <li>
                                                            • "Explain AVL tree
                                                            rotations"
                                                        </li>
                                                        <li>
                                                            • "How do I
                                                            implement binary
                                                            search in Python?"
                                                        </li>
                                                        <li>
                                                            • "Summarize week 3
                                                            theory slides"
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {messages.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className={cn(
                                                            "flex gap-3",
                                                            m.role === "user"
                                                                ? "justify-end"
                                                                : "justify-start",
                                                        )}
                                                    >
                                                        {m.role ===
                                                            "assistant" && (
                                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10">
                                                                <Bot className="size-4 text-primary" />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-2 max-w-[85%]">
                                                            {/* Images */}
                                                            {m.images &&
                                                                m.images
                                                                    .length >
                                                                    0 && (
                                                                    <div
                                                                        className={cn(
                                                                            "grid gap-2 rounded-2xl p-2",
                                                                            m
                                                                                .images
                                                                                .length ===
                                                                                1
                                                                                ? "grid-cols-1"
                                                                                : "grid-cols-2",
                                                                            m.role ===
                                                                                "user"
                                                                                ? "bg-primary/10 border border-primary/20"
                                                                                : "bg-muted/50 border border-border/50",
                                                                        )}
                                                                    >
                                                                        {m.images.map(
                                                                            (
                                                                                img,
                                                                                idx,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="relative group"
                                                                                >
                                                                                    <img
                                                                                        src={
                                                                                            img
                                                                                        }
                                                                                        alt={`Uploaded image ${idx + 1}`}
                                                                                        className="rounded-lg w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                                        onClick={() =>
                                                                                            window.open(
                                                                                                img,
                                                                                                "_blank",
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}

                                                            {/* Text Content */}
                                                            {m.content && (
                                                                <div
                                                                    className={cn(
                                                                        "rounded-2xl px-4 py-3",
                                                                        m.role ===
                                                                            "user"
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "bg-muted border border-border/50",
                                                                    )}
                                                                >
                                                                    <p className="whitespace-pre-wrap leading-relaxed text-sm">
                                                                        {
                                                                            m.content
                                                                        }
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Sources Button */}
                                                            {m.role ===
                                                                "assistant" &&
                                                                m.sources &&
                                                                m.sources
                                                                    .length >
                                                                    0 && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="self-start text-xs gap-1.5"
                                                                        onClick={() =>
                                                                            setSelectedSources(
                                                                                m.sources ||
                                                                                    [],
                                                                            )
                                                                        }
                                                                    >
                                                                        <FileText className="size-3" />
                                                                        {
                                                                            m
                                                                                .sources
                                                                                .length
                                                                        }{" "}
                                                                        source
                                                                        {m
                                                                            .sources
                                                                            .length >
                                                                        1
                                                                            ? "s"
                                                                            : ""}
                                                                    </Button>
                                                                )}
                                                        </div>
                                                        {m.role === "user" && (
                                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60">
                                                                <User className="size-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {isSending && (
                                                    <div className="flex gap-3">
                                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10">
                                                            <Bot className="size-4 text-primary" />
                                                        </div>
                                                        <div className="rounded-2xl px-4 py-3 bg-muted border border-border/50">
                                                            <div className="flex items-center gap-2">
                                                                <Loader2 className="size-4 animate-spin text-primary" />
                                                                <span className="text-sm text-muted-foreground">
                                                                    Thinking...
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div ref={messagesEndRef} />
                                            </>
                                        )}
                                    </div>

                                    {/* Error State */}
                                    {error && (
                                        <div className="px-4 md:px-6 pb-4">
                                            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                                                {error}
                                            </div>
                                        </div>
                                    )}

                                    {/* Input Form */}
                                    <div className="border-t border-border/40 bg-muted/20">
                                        {/* Image Preview */}
                                        {uploadedImages.length > 0 && (
                                            <div className="px-4 pt-4 flex gap-2 flex-wrap">
                                                {uploadedImages.map(
                                                    (img, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative group"
                                                        >
                                                            <img
                                                                src={img}
                                                                alt={`Upload ${idx + 1}`}
                                                                className="h-20 w-20 rounded-lg object-cover border-2 border-border"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeImage(
                                                                        idx,
                                                                    )
                                                                }
                                                                className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center shadow-lg"
                                                            >
                                                                <X className="size-3" />
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                        <form
                                            className="flex gap-2 p-4 md:p-6"
                                            onSubmit={handleSend}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                disabled={isSending}
                                                className="shrink-0 size-10"
                                            >
                                                <Paperclip className="size-4" />
                                                <span className="sr-only">
                                                    Upload image
                                                </span>
                                            </Button>
                                            <Input
                                                value={input}
                                                onChange={(e) =>
                                                    setInput(e.target.value)
                                                }
                                                placeholder="Ask a question or upload an image..."
                                                disabled={isSending}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="submit"
                                                disabled={
                                                    isSending ||
                                                    (!input.trim() &&
                                                        uploadedImages.length ===
                                                            0)
                                                }
                                                size="icon"
                                                className="shrink-0 size-10"
                                            >
                                                {isSending ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <Send className="size-4" />
                                                )}
                                                <span className="sr-only">
                                                    Send
                                                </span>
                                            </Button>
                                        </form>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sources Sidebar */}
                            <Card className="border-2 max-h-[600px] flex flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/40 pb-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="size-5 text-primary" />
                                        Source References
                                    </CardTitle>
                                    <CardDescription>
                                        Materials used to generate the response
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                                    {selectedSources.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                            <div className="size-14 rounded-xl bg-muted flex items-center justify-center">
                                                <BookOpen className="size-7 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm mb-1">
                                                    No sources yet
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Ask a question to see
                                                    relevant sources
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        selectedSources.map((source, idx) => {
                                            const Icon = getSourceIcon(
                                                source.metadata.type,
                                            );
                                            const gradient = getSourceColor(
                                                source.metadata.category,
                                            );

                                            return (
                                                <Card
                                                    key={idx}
                                                    className="border-2 hover:shadow-md transition-shadow"
                                                >
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className={`size-10 rounded-lg bg-gradient-to-br ${gradient} p-2.5 shadow-lg flex-shrink-0`}
                                                            >
                                                                <Icon className="size-5 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-semibold">
                                                                        {source
                                                                            .metadata
                                                                            .source ||
                                                                            "Course Material"}
                                                                    </span>
                                                                    {source
                                                                        .metadata
                                                                        .category && (
                                                                        <Badge
                                                                            variant="default"
                                                                            className="text-xs"
                                                                        >
                                                                            {
                                                                                source
                                                                                    .metadata
                                                                                    .category
                                                                            }
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {source.metadata
                                                                    .topic && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Topic:{" "}
                                                                        {
                                                                            source
                                                                                .metadata
                                                                                .topic
                                                                        }
                                                                    </p>
                                                                )}
                                                                {source.metadata
                                                                    .language && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                    >
                                                                        {
                                                                            source
                                                                                .metadata
                                                                                .language
                                                                        }
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-muted/50 rounded-lg p-3">
                                                            {source.content}
                                                        </p>

                                                        {source.metadata
                                                            .url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full justify-start text-xs gap-2"
                                                                onClick={() =>
                                                                    window.open(
                                                                        source
                                                                            .metadata
                                                                            .url!,
                                                                        "_blank",
                                                                    )
                                                                }
                                                            >
                                                                <ExternalLink className="size-3" />
                                                                View Source
                                                            </Button>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
