"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage, chatWithCourse } from "@/lib/api";

type SimpleMessage = Omit<ChatMessage, "id" | "createdAt">;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      ({ role, content }) => ({ role, content })
    );

    try {
      setIsSending(true);
      const answer = await chatWithCourse(history);
      setMessages((prev) => [...prev, answer]);
    } catch (err) {
      console.error(err);
      setError(
        "Chat request failed. Ensure the /rag/chat endpoint is implemented."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Course Tutor Chat
            </h1>
            <p className="text-muted-foreground text-sm">
              Ask questions about slides, PDFs, and lab code. The assistant
              responds with answers grounded in your course materials.
            </p>
          </div>

          <Card className="flex min-h-[420px] flex-col">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex-1 space-y-3 overflow-auto rounded-md border border-dashed border-border p-3 text-sm">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Start the conversation by asking about a specific topic,
                    slide, or lab exercise.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${
                        m.role === "user"
                          ? "justify-end text-right"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-xs font-medium opacity-80">
                          {m.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form className="flex gap-2" onSubmit={handleSend}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a concept, slide, or lab..."
                />
                <Button type="submit" disabled={isSending}>
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </form>
              {error && (
                <p className="text-sm text-destructive" aria-live="polite">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

