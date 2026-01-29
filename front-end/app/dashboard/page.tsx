import { Navbar } from "@/components/layout/Navbar";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const displayName = "Student";

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {displayName || "Student"}
            </h1>
            <p className="text-muted-foreground">
              This AI-powered companion helps you explore course materials,
              generate notes, and chat with your course content.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Browse and upload lecture slides, PDFs, code, and references
                  for Theory and Lab.
                </p>
                <Button asChild size="sm">
                  <Link href={ROUTES.DASHBOARD_CONTENT}>Open CMS</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intelligent Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask natural-language questions and retrieve the most relevant
                  documents and code snippets.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={ROUTES.DASHBOARD_SEARCH}>Try search</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Learning Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate notes, slide outlines, PDFs, and lab code examples
                  grounded in your course content.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={ROUTES.DASHBOARD_GENERATE}>Generate content</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validation & Chat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Validate generated code and interact with an AI tutor that
                  stays grounded in your course.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={ROUTES.DASHBOARD_VALIDATE}>Validate code</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={ROUTES.DASHBOARD_CHAT}>Open chat</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.HOME}>Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
