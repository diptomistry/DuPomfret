"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { ChatMessage, chatWithCourse } from "@/lib/api";
import { MessageCircle, Send, Loader2, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type SimpleMessage = Omit<ChatMessage, "id" | "createdAt">;

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const content = input.trim();
        if (!content) return;
        setInput("");
        setError(null);

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        const history: SimpleMessage[] = [...messages, userMessage].map(
            ({ role, content }) => ({ role, content }),
        );

        try {
            setIsSending(true);
            const answer = await chatWithCourse(history);
            setMessages((prev) => [...prev, answer]);
        } catch (err) {
            console.error(err);
            setError(
                "Chat request failed. Ensure the /rag/chat endpoint is implemented.",
            );
        } finally {
            setIsSending(false);
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
                            <h1 className="page-title">AI Tutor</h1>
                            <p className="page-description">
                                Ask questions about your course materials and
                                get answers grounded in your content.
                            </p>
                        </div>

                        {/* Chat Card */}
                        <Card className="flex min-h-[60svh] sm:min-h-[500px] flex-col overflow-hidden">
                            <CardHeader className="border-b border-border/40 p-3 sm:pb-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                    <MessageCircle className="size-4 sm:size-5 text-primary" />
                                    Conversation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col gap-4 p-0">
                                {/* Messages Area */}
                                <div className="flex-1 space-y-3 sm:space-y-4 overflow-auto p-3 sm:p-4 md:p-6">
                                    {messages.length === 0 ? (
                                        <EmptyState
                                            icon={MessageCircle}
                                            title="Start a conversation"
                                            description="Ask about a concept, slide, or lab to get started."
                                        />
                                    ) : (
                                        <>
                                            {messages.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className={cn(
                                                        "flex gap-2 sm:gap-3",
                                                        m.role === "user"
                                                            ? "justify-end"
                                                            : "justify-start",
                                                    )}
                                                >
                                                    {m.role === "assistant" && (
                                                        <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                                                            <Bot className="size-3.5 sm:size-4 text-primary" />
                                                        </div>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            "chat-bubble",
                                                            m.role === "user"
                                                                ? "chat-bubble-user"
                                                                : "chat-bubble-assistant",
                                                        )}
                                                    >
                                                        <p className="whitespace-pre-wrap leading-relaxed text-sm">
                                                            {m.content}
                                                        </p>
                                                    </div>
                                                    {m.role === "user" && (
                                                        <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/60">
                                                            <User className="size-3.5 sm:size-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {isSending && (
                                                <div className="flex gap-2 sm:gap-3">
                                                    <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                                                        <Bot className="size-3.5 sm:size-4 text-primary" />
                                                    </div>
                                                    <div className="chat-bubble chat-bubble-assistant">
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="size-4 animate-spin text-primary" />
                                                            <span className="text-xs sm:text-sm text-muted-foreground">
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
                                    <div className="px-3 sm:px-4 md:px-6">
                                        <ErrorState message={error} />
                                    </div>
                                )}

                                {/* Input Form */}
                                <form
                                    className="flex gap-2 border-t border-border/40 bg-muted/20 p-3 sm:p-4 md:p-6"
                                    onSubmit={handleSend}
                                >
                                    <Input
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        placeholder="Ask a question..."
                                        disabled={isSending}
                                        className="flex-1 text-sm"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isSending || !input.trim()}
                                        size="icon"
                                        className="shrink-0 size-9"
                                    >
                                        {isSending ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Send className="size-4" />
                                        )}
                                        <span className="sr-only">Send</span>
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
