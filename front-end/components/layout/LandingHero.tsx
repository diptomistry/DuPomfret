"use client";

import Link from "next/link";
import { LottieAnimation } from "@/components/ui/lottie-animation";
import chatbotAnimation from "@/public/Live chatbot.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import {
    Sparkles,
    ArrowRight,
    Brain,
    Zap,
    Code2,
    GraduationCap,
} from "lucide-react";

const stats = [
    { icon: Brain, value: "AI-Powered", label: "Smart Assistance" },
    { icon: Zap, value: "Instant", label: "Search Results" },
    { icon: Code2, value: "Code", label: "Validation" },
    { icon: GraduationCap, value: "Course", label: "Grounded" },
];

export function LandingHero() {
    return (
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute left-[10%] top-[20%] size-96 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-3xl" />
                <div className="absolute right-[10%] bottom-[20%] size-96 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 blur-3xl" />
            </div>

            <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
                    {/* Left content */}
                    <div className="text-center lg:text-left">
                        <Badge
                            variant="primary"
                            className="mb-6 px-4 py-1.5 text-sm font-medium shadow-lg shadow-primary/20"
                        >
                            <Sparkles className="mr-1.5 size-3.5" />
                            AI-Powered Learning Platform
                        </Badge>

                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                            Your{" "}
                            <span className="relative inline-block">
                                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    AI Course
                                </span>
                                <svg
                                    className="absolute -bottom-2 left-0 w-full hidden sm:block"
                                    viewBox="0 0 300 12"
                                    fill="none"
                                >
                                    <path
                                        d="M2 10C50 4 150 4 298 10"
                                        stroke="url(#underline-gradient)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient
                                            id="underline-gradient"
                                            x1="0"
                                            y1="0"
                                            x2="300"
                                            y2="0"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="oklch(0.55 0.18 260)"
                                            />
                                            <stop
                                                offset="50%"
                                                stopColor="oklch(0.65 0.25 300)"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="oklch(0.7 0.25 330)"
                                            />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </span>
                            <br />
                            <span className="text-foreground">Companion</span>
                        </h1>

                        <p className="mx-auto lg:mx-0 mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl leading-relaxed">
                            One place for your course slides, PDFs, lab code,
                            and notes – with{" "}
                            <span className="font-semibold text-foreground">
                                semantic search
                            </span>
                            ,{" "}
                            <span className="font-semibold text-foreground">
                                AI generation
                            </span>
                            , and{" "}
                            <span className="font-semibold text-foreground">
                                chat tutor
                            </span>
                            .
                        </p>

                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:w-auto h-12 px-8 text-base font-semibold gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                            >
                                <Link href={ROUTES.LOGIN}>
                                    Get Started Free
                                    <ArrowRight className="size-5" />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                asChild
                                size="lg"
                                className="w-full sm:w-auto h-12 px-8 text-base font-medium border-2 hover:bg-muted/50"
                            >
                                <Link href={ROUTES.DASHBOARD}>
                                    Explore Dashboard
                                </Link>
                            </Button>
                        </div>

                        {/* Stats Bar */}
                        <div className="mx-auto lg:mx-0 mt-12 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-3 backdrop-blur-sm transition-all duration-300 hover:bg-card/80 hover:border-primary/30"
                                >
                                    <stat.icon className="mb-2 size-5 text-primary" />
                                    <span className="text-sm font-bold text-foreground">
                                        {stat.value}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {stat.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right content - Lottie Animation */}
                    <div className="flex items-center justify-center lg:justify-end">
                        <div className="relative">
                            {/* Glow effect behind animation */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-3xl" />
                            <LottieAnimation
                                animationData={chatbotAnimation}
                                className="relative w-full max-w-md lg:max-w-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
