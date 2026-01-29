"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CourseComponent,
  GeneratedContent,
  generateLearningMaterial,
} from "@/lib/api";

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [component, setComponent] = useState<CourseComponent>("theory");
  const [type, setType] = useState<GeneratedContent["type"]>("notes");
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateLearningMaterial({
        topic,
        component,
        type,
        language: component === "lab" ? language : undefined,
      });
      setOutput(result);
    } catch (err) {
      console.error(err);
      setError(
        "Generation failed. Check the /media/generate endpoint and payload."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              AI-Generated Learning Materials
            </h1>
            <p className="text-muted-foreground text-sm">
              Create structured notes, slide outlines, PDFs, and lab code based
              on your course content.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generation request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleGenerate}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic / prompt</label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Dynamic Programming for shortest paths"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
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
                    <label className="text-sm font-medium">Material type</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as GeneratedContent["type"])
                      }
                    >
                      <option value="notes">Reading notes</option>
                      <option value="slides">Slides outline</option>
                      <option value="pdf">PDF-style handout</option>
                      <option value="code">Lab code examples</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Language (for Lab code)
                    </label>
                    <Input
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. python, cpp, java"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate material"}
                </Button>
              </form>
              {error && (
                <p className="text-sm text-destructive" aria-live="polite">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          {output && (
            <Card>
              <CardHeader>
                <CardTitle>{output.title || "Generated content"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">
                  Type: {output.type}{" "}
                  {output.language ? `• Language: ${output.language}` : null}
                </p>
                <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
                  {output.body}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

