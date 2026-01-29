"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  CourseComponent,
  GeneratedContent,
  generateLearningMaterial,
} from "@/lib/api";
import { Sparkles, FileText, Code, Presentation, BookOpen, Loader2 } from "lucide-react";

const typeIcons = {
  notes: BookOpen,
  slides: Presentation,
  pdf: FileText,
  code: Code,
};

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

  const TypeIcon = typeIcons[type] || FileText;

  return (
    <div className="min-h-svh">
      <Navbar />
      <AppShell>
        <div className="page-shell">
          <div className="page-stack">
            {/* Header */}
            <div className="page-header">
              <h1 className="page-title">AI Generator</h1>
              <p className="page-description">
                Create notes, slide outlines, and code examples from your course content.
              </p>
            </div>

            {/* Generation Form */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="size-4 sm:size-5 text-primary" />
                  Create Content
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Describe what you want to generate and pick a format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                <form className="space-y-4" onSubmit={handleGenerate}>
                  {/* Topic Input */}
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic / Prompt</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Dynamic Programming for shortest paths"
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Options Grid */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="component">Component</Label>
                      <Select
                        id="component"
                        value={component}
                        onChange={(e) =>
                          setComponent(e.target.value as CourseComponent)
                        }
                        disabled={isGenerating}
                      >
                        <option value="theory">Theory</option>
                        <option value="lab">Lab</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Material Type</Label>
                      <Select
                        id="type"
                        value={type}
                        onChange={(e) =>
                          setType(e.target.value as GeneratedContent["type"])
                        }
                        disabled={isGenerating}
                      >
                        <option value="notes">Reading Notes</option>
                        <option value="slides">Slides Outline</option>
                        <option value="pdf">PDF-style Handout</option>
                        <option value="code">Lab Code Examples</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">
                        Language {component !== "lab" && "(for Lab)"}
                      </Label>
                      <Input
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="e.g. python, cpp, java"
                        disabled={isGenerating || component !== "lab"}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isGenerating || !topic.trim()}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Create Content
                      </>
                    )}
                  </Button>
                </form>

                {error && <ErrorState message={error} />}
              </CardContent>
            </Card>

            {/* Loading State */}
            {isGenerating && <SkeletonCard className="min-h-[200px] sm:min-h-[300px]" />}

            {/* Output Card */}
            {!isGenerating && output && (
              <Card className="border-primary/30">
                <CardHeader className="p-3 sm:p-6 pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 sm:p-2.5">
                        <TypeIcon className="size-4 sm:size-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base">
                          {output.title || "Generated Content"}
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-xs">
                          {output.type}
                          {output.language && ` • ${output.language}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-10 sm:ml-0">
                      <Badge variant={component === "lab" ? "lab" : "theory"} className="text-xs">
                        {component}
                      </Badge>
                      <Badge variant="primary" className="text-xs">{output.type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <pre className="max-h-[300px] sm:max-h-[500px] overflow-auto rounded-xl border border-border/60 bg-muted/40 p-3 sm:p-4 text-xs leading-relaxed font-mono backdrop-blur-sm">
                    {output.body}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </AppShell>
    </div>
  );
}

