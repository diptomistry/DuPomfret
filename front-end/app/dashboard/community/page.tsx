"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    MessageSquare,
    Send,
    ArrowLeft,
    Loader2,
    Bot,
    User,
    X,
    Users,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Post {
    id: string;
    title: string;
    body: string;
    author_id: string;
    users?: { display_name: string };
    course_id?: string;
    category: string;
    tags: string[];
    visibility: string;
    created_at: string;
}

interface Comment {
    id: string;
    post_id: string;
    author_id: string | null;
    users?: { display_name: string };
    body: string;
    parent_comment_id?: string;
    is_bot: boolean;
    is_auto_reply: boolean;
    grounding_metadata?: any;
    created_at: string;
}

interface Course {
    id: string;
    code: string;
    title: string;
}

export default function CommunityPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");

    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState("");
    const [newPostBody, setNewPostBody] = useState("");
    const [newPostTags, setNewPostTags] = useState("");
    const [newPostCategory, setNewPostCategory] = useState("question");

    const [newComment, setNewComment] = useState("");
    const [replyToId, setReplyToId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [botLoadingCommentId, setBotLoadingCommentId] = useState<
        string | null
    >(null);

    const handleReplyClick = (commentId: string) => {
        setReplyToId(commentId);
        // Scroll to comment input
        setTimeout(() => {
            const commentInput = document.querySelector(
                'textarea[placeholder*="reply"]',
            );
            if (commentInput) {
                commentInput.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
                (commentInput as HTMLTextAreaElement).focus();
            }
        }, 100);
    };

    useEffect(() => {
        fetchCourses();
        fetchPosts();
    }, []);

    useEffect(() => {
        if (selectedPost) {
            fetchComments(selectedPost.id);
        }
    }, [selectedPost]);

    const fetchCourses = async () => {
        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch("http://localhost:8000/courses", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    };

    const fetchPosts = async (courseId?: string) => {
        try {
            setIsLoading(true);
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const url = courseId
                ? `http://localhost:8000/community/posts?course_id=${courseId}`
                : "http://localhost:8000/community/posts";

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (err) {
            console.error("Error fetching posts:", err);
            setError("Failed to load posts");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchComments = async (postId: string) => {
        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `http://localhost:8000/community/posts/${postId}/comments`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostTitle.trim() || !newPostBody.trim()) return;

        try {
            setIsLoading(true);
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                "http://localhost:8000/community/posts",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: newPostTitle,
                        body: newPostBody,
                        category: newPostCategory,
                        tags: newPostTags
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        course_id: selectedCourse || undefined,
                    }),
                },
            );

            if (response.ok) {
                setNewPostTitle("");
                setNewPostBody("");
                setNewPostTags("");
                setNewPostCategory("question");
                setShowCreatePost(false);
                await fetchPosts();
            } else {
                setError("Failed to create post");
            }
        } catch (err) {
            console.error("Error creating post:", err);
            setError("Error creating post");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateComment = async () => {
        if (!newComment.trim() || !selectedPost) return;

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `http://localhost:8000/community/posts/${selectedPost.id}/comments`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        body: newComment,
                        parent_comment_id: replyToId || undefined,
                    }),
                },
            );

            if (response.ok) {
                setNewComment("");
                setReplyToId(null);
                setError(null);
                await fetchComments(selectedPost.id);
            } else {
                const errorData = await response.json();
                setError(
                    `Failed to create comment: ${errorData.detail || "Unknown error"}`,
                );
            }
        } catch (err) {
            console.error("Error creating comment:", err);
            setError("Error creating comment. Please try again.");
        }
    };

    const handleRequestBotHelp = async (commentId: string) => {
        if (!selectedPost) return;

        try {
            setBotLoadingCommentId(commentId);
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `http://localhost:8000/community/posts/${selectedPost.id}/bot-reply?parent_comment_id=${commentId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                },
            );

            if (response.ok) {
                await fetchComments(selectedPost.id);
            } else {
                setError("Failed to get AI assistance");
            }
        } catch (err) {
            console.error("Error requesting bot help:", err);
            setError("Error requesting AI assistance");
        } finally {
            setBotLoadingCommentId(null);
        }
    };

    const handleAskAIAboutPost = async () => {
        if (!selectedPost) return;

        try {
            setIsLoading(true);
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;

            // Create a temporary comment to ask about the post
            const tempCommentResponse = await fetch(
                `http://localhost:8000/community/posts/${selectedPost.id}/comments`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        body: "Can you help me understand this post?",
                        parent_comment_id: undefined,
                    }),
                },
            );

            if (tempCommentResponse.ok) {
                const tempComment = await tempCommentResponse.json();

                // Now request bot reply for this comment
                const botResponse = await fetch(
                    `http://localhost:8000/community/posts/${selectedPost.id}/bot-reply?parent_comment_id=${tempComment.id}`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    },
                );

                if (botResponse.ok) {
                    await fetchComments(selectedPost.id);
                } else {
                    setError("Failed to get AI assistance");
                }
            }
        } catch (err) {
            console.error("Error requesting AI about post:", err);
            setError("Error requesting AI assistance");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const renderComment = (comment: Comment, depth: number = 0) => {
        const replies = comments.filter(
            (c) => c.parent_comment_id === comment.id,
        );
        const marginLeft = depth > 0 ? 16 : 0;

        return (
            <div
                key={comment.id}
                style={{ marginLeft: `${marginLeft}px` }}
                className="mb-3"
            >
                <div
                    className={cn(
                        "p-3 rounded-lg border text-sm",
                        comment.is_bot
                            ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                            : "bg-card",
                    )}
                >
                    <div className="flex items-start gap-2.5">
                        <div
                            className={cn(
                                "size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                comment.is_bot ? "bg-blue-500" : "bg-primary",
                            )}
                        >
                            {comment.is_bot ? (
                                <Bot className="size-3.5 text-white" />
                            ) : (
                                <User className="size-3.5 text-white" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-sm">
                                    {comment.is_bot
                                        ? "AI Assistant"
                                        : comment.users?.display_name ||
                                          "Anonymous"}
                                </span>
                                {comment.is_bot && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] h-4 px-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                                    >
                                        Bot
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(comment.created_at)}
                                </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                {comment.body}
                            </p>

                            {/* Bot Grounding Sources */}
                            {comment.is_bot &&
                                comment.grounding_metadata &&
                                Array.isArray(comment.grounding_metadata) &&
                                comment.grounding_metadata.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                                            📚 Sources:
                                        </p>
                                        <div className="space-y-1">
                                            {comment.grounding_metadata
                                                .slice(0, 3)
                                                .map(
                                                    (
                                                        source: any,
                                                        idx: number,
                                                    ) => (
                                                        <div
                                                            key={idx}
                                                            className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1"
                                                        >
                                                            <span className="font-medium">
                                                                {idx + 1}.
                                                            </span>
                                                            <span className="flex-1">
                                                                {source.metadata
                                                                    ?.content_type ||
                                                                    "Document"}{" "}
                                                                -{" "}
                                                                {source.metadata
                                                                    ?.topic ||
                                                                    "Related content"}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                        </div>
                                    </div>
                                )}

                            {/* Reply Button */}
                            {!comment.is_bot && depth < 3 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 mt-2 text-xs"
                                    onClick={() => handleReplyClick(comment.id)}
                                >
                                    <Send className="size-3 mr-1" />
                                    Reply
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
        );
    };

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Header */}
                        <div className="page-header">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                    <Users className="size-5 text-white" />
                                </div>
                                <h1 className="page-title">Community</h1>
                            </div>
                            <p className="page-description">
                                Ask questions, share knowledge, and collaborate
                                with AI-powered assistance
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <Card className="border-destructive/50 bg-destructive/5">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-destructive text-sm">
                                        <X className="size-4" />
                                        <p>{error}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Main Content Area */}
                        {!selectedPost ? (
                            /* Posts List View */
                            <>
                                {/* Filters & Actions */}
                                <Card>
                                    <CardContent className="p-3 sm:p-4">
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                                            <div className="flex-1">
                                                <Label
                                                    htmlFor="course-filter"
                                                    className="text-xs mb-1.5 block"
                                                >
                                                    Filter by Course
                                                </Label>
                                                <select
                                                    id="course-filter"
                                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                                                    value={selectedCourse}
                                                    onChange={(e) => {
                                                        setSelectedCourse(
                                                            e.target.value,
                                                        );
                                                        fetchPosts(
                                                            e.target.value,
                                                        );
                                                    }}
                                                >
                                                    <option value="">
                                                        All Courses
                                                    </option>
                                                    {courses.map((course) => (
                                                        <option
                                                            key={course.id}
                                                            value={course.id}
                                                        >
                                                            {course.code} -{" "}
                                                            {course.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    onClick={() =>
                                                        setShowCreatePost(
                                                            !showCreatePost,
                                                        )
                                                    }
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Plus className="size-4 mr-2" />
                                                    New Post
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Create Post Form */}
                                {showCreatePost && (
                                    <Card className="border-primary/20">
                                        <CardHeader className="p-3 sm:p-6 pb-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <MessageSquare className="size-4 text-primary" />
                                                Create New Post
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm">
                                                Share your question or start a
                                                discussion
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="post-category"
                                                    className="text-xs sm:text-sm"
                                                >
                                                    Category
                                                </Label>
                                                <select
                                                    id="post-category"
                                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                                                    value={newPostCategory}
                                                    onChange={(e) =>
                                                        setNewPostCategory(
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="question">
                                                        Question
                                                    </option>
                                                    <option value="discussion">
                                                        Discussion
                                                    </option>
                                                    <option value="announcement">
                                                        Announcement
                                                    </option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="post-title"
                                                    className="text-xs sm:text-sm"
                                                >
                                                    Title
                                                </Label>
                                                <Input
                                                    id="post-title"
                                                    value={newPostTitle}
                                                    onChange={(e) =>
                                                        setNewPostTitle(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="What's your question or topic?"
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="post-body"
                                                    className="text-xs sm:text-sm"
                                                >
                                                    Description
                                                </Label>
                                                <Textarea
                                                    id="post-body"
                                                    value={newPostBody}
                                                    onChange={(e) =>
                                                        setNewPostBody(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Provide details about your question or discussion..."
                                                    rows={5}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="post-tags"
                                                    className="text-xs sm:text-sm"
                                                >
                                                    Tags (comma separated)
                                                </Label>
                                                <Input
                                                    id="post-tags"
                                                    value={newPostTags}
                                                    onChange={(e) =>
                                                        setNewPostTags(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., python, algorithms, debugging"
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    onClick={handleCreatePost}
                                                    disabled={
                                                        isLoading ||
                                                        !newPostTitle.trim() ||
                                                        !newPostBody.trim()
                                                    }
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="size-4 mr-2" />
                                                            Create Post
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setShowCreatePost(false)
                                                    }
                                                    disabled={isLoading}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Posts List */}
                                {isLoading && posts.length === 0 ? (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                                                <Loader2 className="size-5 animate-spin" />
                                                <span className="text-sm">
                                                    Loading posts...
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : posts.length === 0 ? (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-center py-12 text-muted-foreground">
                                                <MessageSquare className="size-12 mx-auto mb-4 opacity-20" />
                                                <p className="text-sm font-medium mb-1">
                                                    No posts yet
                                                </p>
                                                <p className="text-xs">
                                                    Be the first to start a
                                                    discussion!
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {posts.map((post) => (
                                            <Card
                                                key={post.id}
                                                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                                                onClick={() =>
                                                    setSelectedPost(post)
                                                }
                                            >
                                                <CardHeader className="p-4 pb-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">
                                                                {post.title}
                                                            </CardTitle>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <User className="size-3" />
                                                                <span className="truncate">
                                                                    {post.users
                                                                        ?.display_name ||
                                                                        "Anonymous"}
                                                                </span>
                                                                <span>•</span>
                                                                <span>
                                                                    {formatDate(
                                                                        post.created_at,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="shrink-0 text-xs"
                                                        >
                                                            {post.category}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                                                        {post.body}
                                                    </p>
                                                    {post.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {post.tags
                                                                .slice(0, 4)
                                                                .map(
                                                                    (
                                                                        tag,
                                                                        idx,
                                                                    ) => (
                                                                        <Badge
                                                                            key={
                                                                                idx
                                                                            }
                                                                            variant="outline"
                                                                            className="text-[10px] h-5 px-2"
                                                                        >
                                                                            {
                                                                                tag
                                                                            }
                                                                        </Badge>
                                                                    ),
                                                                )}
                                                            {post.tags.length >
                                                                4 && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] h-5 px-2"
                                                                >
                                                                    +
                                                                    {post.tags
                                                                        .length -
                                                                        4}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Post Detail View */
                            <>
                                {/* Back Button */}
                                <div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectedPost(null);
                                            setComments([]);
                                            setReplyToId(null);
                                            setNewComment("");
                                        }}
                                        className="h-9 px-3"
                                    >
                                        <ArrowLeft className="size-4 mr-2" />
                                        Back to Posts
                                    </Button>
                                </div>

                                {/* Post Detail */}
                                <Card>
                                    <CardHeader className="p-4 sm:p-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-xl sm:text-2xl mb-3">
                                                    {selectedPost.title}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <User className="size-4" />
                                                    <span>
                                                        {selectedPost.users
                                                            ?.display_name ||
                                                            "Anonymous"}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {formatDate(
                                                            selectedPost.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge className="shrink-0">
                                                {selectedPost.category}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6 pt-0">
                                        <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap mb-4 leading-relaxed">
                                            {selectedPost.body}
                                        </p>
                                        {selectedPost.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {selectedPost.tags.map(
                                                    (tag, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                        {/* Ask AI Button */}
                                        <div className="pt-3 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAskAIAboutPost}
                                                disabled={isLoading}
                                                className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                                        Getting AI Answer...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bot className="size-4 mr-2" />
                                                        Ask AI About This Post
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comments Section */}
                                <Card>
                                    <CardHeader className="p-4 sm:p-6 pb-4">
                                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                            <MessageSquare className="size-4 sm:size-5 text-primary" />
                                            Comments (
                                            {
                                                comments.filter(
                                                    (c) => !c.parent_comment_id,
                                                ).length
                                            }
                                            )
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                                        {/* Comment Input */}
                                        <div className="space-y-2">
                                            {replyToId && (
                                                <div className="flex items-start gap-2 text-xs bg-muted px-3 py-2 rounded-lg border">
                                                    <div className="flex-1">
                                                        <p className="text-muted-foreground mb-1">
                                                            Replying to:
                                                        </p>
                                                        <p className="text-foreground font-medium line-clamp-2">
                                                            {comments.find(
                                                                (c) =>
                                                                    c.id ===
                                                                    replyToId,
                                                            )?.body ||
                                                                "comment"}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setReplyToId(null)
                                                        }
                                                        className="h-6 w-6 p-0 shrink-0"
                                                    >
                                                        <X className="size-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            <Textarea
                                                value={newComment}
                                                onChange={(e) =>
                                                    setNewComment(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={
                                                    replyToId
                                                        ? "Write your reply..."
                                                        : "Add a comment..."
                                                }
                                                className="text-sm min-h-[80px]"
                                                rows={3}
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={
                                                        handleCreateComment
                                                    }
                                                    size="sm"
                                                    disabled={
                                                        !newComment.trim()
                                                    }
                                                >
                                                    <Send className="size-3.5 mr-2" />
                                                    {replyToId
                                                        ? "Reply"
                                                        : "Comment"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Comments List */}
                                        <div className="space-y-2 pt-2">
                                            {comments.filter(
                                                (c) => !c.parent_comment_id,
                                            ).length === 0 ? (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <MessageSquare className="size-10 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm font-medium mb-1">
                                                        No comments yet
                                                    </p>
                                                    <p className="text-xs">
                                                        Be the first to comment!
                                                    </p>
                                                </div>
                                            ) : (
                                                comments
                                                    .filter(
                                                        (c) =>
                                                            !c.parent_comment_id,
                                                    )
                                                    .map((comment) =>
                                                        renderComment(comment),
                                                    )
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
