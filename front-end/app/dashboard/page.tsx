import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthDisplayName } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BookOpen,
    Search,
    Sparkles,
    CheckCircle,
    MessageCircle,
    ArrowRight,
    Lightbulb,
    Rocket,
    Bot,
    PenTool,
} from "lucide-react";

const features = [
    {
        title: "Course Materials",
        description:
            "Upload and browse lecture slides, PDFs, code files, and references.",
        href: ROUTES.DASHBOARD_CONTENT,
        icon: BookOpen,
        badge: "Files",
        badgeVariant: "default" as const,
        action: "Manage Files",
        gradient: "from-blue-500 to-cyan-400",
        shadowColor: "hover:shadow-blue-500/20",
    },
    {
        title: "AI Search",
        description:
            "Ask questions in plain English and find relevant documents instantly.",
        href: ROUTES.DASHBOARD_SEARCH,
        icon: Search,
        badge: "RAG",
        badgeVariant: "primary" as const,
        action: "Start Search",
        gradient: "from-purple-500 to-pink-500",
        shadowColor: "hover:shadow-purple-500/20",
    },
    {
        title: "AI Generator",
        description:
            "Create study notes, slide outlines, and code examples from your content.",
        href: ROUTES.DASHBOARD_GENERATE,
        icon: Sparkles,
        badge: "AI",
        badgeVariant: "primary" as const,
        action: "Create Content",
        gradient: "from-orange-500 to-amber-400",
        shadowColor: "hover:shadow-orange-500/20",
    },
    {
        title: "Code Checker",
        description:
            "Validate code with syntax checks, tests, and helpful diagnostics.",
        href: ROUTES.DASHBOARD_VALIDATE,
        icon: CheckCircle,
        badge: "Lab",
        badgeVariant: "lab" as const,
        action: "Check Code",
        gradient: "from-emerald-500 to-teal-400",
        shadowColor: "hover:shadow-emerald-500/20",
    },
    {
        title: "AI Tutor",
        description:
            "Chat with an AI assistant that knows your course materials.",
        href: ROUTES.DASHBOARD_CHAT,
        icon: MessageCircle,
        badge: "Chat",
        badgeVariant: "default" as const,
        action: "Start Chat",
        gradient: "from-rose-500 to-pink-400",
        shadowColor: "hover:shadow-rose-500/20",
    },
    {
        title: "Live AI Tutor",
        description:
            "Connect with AI-powered tutors for personalized learning sessions.",
        href: ROUTES.DASHBOARD_ASSISTANT,
        icon: Bot,
        badge: "Live",
        badgeVariant: "primary" as const,
        action: "Start Session",
        gradient: "from-violet-500 to-purple-400",
        shadowColor: "hover:shadow-violet-500/20",
    },
    {
        title: "Handwritten Notes",
        description:
            "Digitize handwritten notes into beautifully formatted text with LaTeX support.",
        href: ROUTES.DASHBOARD_NOTES,
        icon: PenTool,
        badge: "New",
        badgeVariant: "primary" as const,
        action: "Digitize Notes",
        gradient: "from-indigo-500 to-blue-400",
        shadowColor: "hover:shadow-indigo-500/20",
    },
];

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(ROUTES.LOGIN);
    }

    const displayName = getAuthDisplayName(user);

    return (
        <div className="min-h-svh">
            <Navbar />
            <AppShell>
                <div className="page-shell">
                    <div className="page-stack">
                        {/* Welcome Header */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                                Welcome back,{" "}
                                <span className="bg-linear-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    {displayName || "Student"}
                                </span>{" "}
                                👋
                            </h1>
                            <p className="text-sm text-muted-foreground sm:text-base lg:text-lg max-w-2xl">
                                Explore materials, generate notes, validate
                                code, and chat with your course content.
                            </p>
                        </div>

                        {/* Section Title */}
                        <div className="flex items-center justify-between pt-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight sm:text-2xl flex items-center gap-2">
                                    <Rocket className="size-5 text-primary" />
                                    Quick Actions
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Jump into any feature to start learning
                                    smarter
                                </p>
                            </div>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                            {features.map((feature, index) => (
                                <Card
                                    key={feature.href}
                                    className={`group relative overflow-hidden transition-all duration-300 hover:border-transparent hover:shadow-xl ${feature.shadowColor} dark:bg-card/60 hover:-translate-y-1`}
                                >
                                    {/* Subtle gradient overlay on hover */}
                                    <div
                                        className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5 dark:group-hover:opacity-10`}
                                    />

                                    {/* Animated border glow */}
                                    <div
                                        className={`absolute inset-0 rounded-xl bg-linear-to-br ${feature.gradient} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20`}
                                    />

                                    <CardHeader className="relative pb-2 sm:pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div
                                                className={`rounded-xl bg-linear-to-br ${feature.gradient} p-3 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}
                                            >
                                                <feature.icon className="size-5 text-white" />
                                            </div>
                                            <Badge
                                                variant={feature.badgeVariant}
                                                className="font-semibold text-xs"
                                            >
                                                {feature.badge}
                                            </Badge>
                                        </div>
                                        <CardTitle className="relative mt-4 text-lg sm:text-xl font-bold">
                                            {feature.title}
                                        </CardTitle>
                                        <CardDescription className="relative line-clamp-2 text-sm leading-relaxed">
                                            {feature.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="relative pt-1">
                                        <Button
                                            asChild
                                            size="sm"
                                            className={`w-full bg-linear-to-r ${feature.gradient} text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
                                        >
                                            <Link href={feature.href}>
                                                {feature.action}
                                                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Tips Section */}
                        <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 bg-linear-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-yellow-500/10">
                            <div className="absolute -top-20 -right-20 size-40 rounded-full bg-linear-to-br from-amber-500/20 to-orange-500/20 blur-3xl" />
                            <CardContent className="relative flex flex-col sm:flex-row items-center gap-6 py-8 sm:py-10">
                                <div className="shrink-0 rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 p-4 shadow-xl shadow-amber-500/25">
                                    <Lightbulb className="size-8 text-white" />
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="text-lg font-bold text-foreground mb-2">
                                        Pro Tip
                                    </h3>
                                    <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                                        Start by uploading your course materials
                                        in{" "}
                                        <span className="font-semibold text-primary">
                                            Materials
                                        </span>
                                        , then use{" "}
                                        <span className="font-semibold text-primary">
                                            AI Search
                                        </span>{" "}
                                        and{" "}
                                        <span className="font-semibold text-primary">
                                            AI Tutor
                                        </span>{" "}
                                        to interact with your content using
                                        natural language.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Removed bearer token display for security */}
                    </div>
                </div>
            </AppShell>
        </div>
    );
}
