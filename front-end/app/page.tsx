import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { LandingHero } from "@/components/layout/LandingHero";
import {
    Search,
    BookOpen,
    MessageCircle,
    Sparkles,
    ArrowRight,
    GraduationCap,
} from "lucide-react";

const features = [
    {
        icon: BookOpen,
        title: "Smart Content Hub",
        description:
            "Upload and organize lecture slides, PDFs, code, and notes with intelligent metadata tagging.",
        gradient: "from-blue-500 to-cyan-400",
        shadowColor: "shadow-blue-500/20",
    },
    {
        icon: Search,
        title: "Semantic Search",
        description:
            "Find exactly what you need with natural language queries across all your course materials.",
        gradient: "from-purple-500 to-pink-500",
        shadowColor: "shadow-purple-500/20",
    },
    {
        icon: Sparkles,
        title: "AI Generation",
        description:
            "Create study notes, slide outlines, and code examples grounded in your syllabus content.",
        gradient: "from-orange-500 to-amber-400",
        shadowColor: "shadow-orange-500/20",
    },
    {
        icon: MessageCircle,
        title: "AI Tutor Chat",
        description:
            "Get instant answers from an AI assistant that deeply understands your course content.",
        gradient: "from-emerald-500 to-teal-400",
        shadowColor: "shadow-emerald-500/20",
    },
];

export default async function HomePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect(ROUTES.DASHBOARD);
    }

    return (
        <div className="min-h-svh">
            <Navbar />
            <main className="w-full">
                {/* Hero Section with Lottie Animation */}
                <LandingHero />

                {/* Features Section */}
                <section className="relative px-4 py-16 sm:px-6 lg:py-24">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Everything you need to{" "}
                                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                                    learn smarter
                                </span>
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Powerful AI tools designed specifically for
                                university students.
                            </p>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={feature.title}
                                    className={`group relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl transition-all duration-500 hover:border-transparent hover:shadow-2xl ${feature.shadowColor} dark:bg-card/40 sm:p-8`}
                                >
                                    {/* Gradient overlay on hover */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-5 dark:group-hover:opacity-10`}
                                    />

                                    {/* Icon with gradient background */}
                                    <div
                                        className={`relative mb-5 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-3.5 shadow-lg ${feature.shadowColor} transition-transform duration-300 group-hover:scale-110`}
                                    >
                                        <feature.icon className="size-6 text-white" />
                                    </div>

                                    <h3 className="relative text-xl font-bold tracking-tight sm:text-2xl">
                                        {feature.title}
                                    </h3>
                                    <p className="relative mt-3 text-base text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>

                                    {/* Arrow indicator */}
                                    <div className="relative mt-5 flex items-center text-sm font-semibold text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
                                        Learn more{" "}
                                        <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="relative px-4 py-16 sm:px-6 lg:py-24">
                    <div className="mx-auto max-w-4xl">
                        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 p-8 text-center backdrop-blur-xl sm:p-12">
                            <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
                            <GraduationCap className="relative mx-auto mb-6 size-12 text-primary" />
                            <h2 className="relative text-2xl font-bold sm:text-3xl lg:text-4xl">
                                Ready to ace your courses?
                            </h2>
                            <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
                                Join students who are already learning smarter
                                with AI-powered study tools.
                            </p>
                            <Button
                                asChild
                                size="lg"
                                className="relative mt-8 h-12 px-8 text-base font-semibold shadow-xl shadow-primary/25"
                            >
                                <Link href={ROUTES.LOGIN}>
                                    Start Learning Now
                                    <ArrowRight className="ml-2 size-5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-border/50 px-4 py-8 text-center sm:px-6">
                    <p className="text-sm text-muted-foreground">
                        Built for students who want to learn smarter, not
                        harder.
                    </p>
                </footer>
            </main>
        </div>
    );
}
