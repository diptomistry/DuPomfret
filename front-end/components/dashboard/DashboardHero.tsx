"use client";

import { LottieAnimation } from "@/components/ui/lottie-animation";
import chatbotAnimation from "@/public/Live chatbot.json";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Zap, GraduationCap, TrendingUp } from "lucide-react";

interface DashboardHeroProps {
    displayName: string | null;
}

const quickStats = [
    { icon: Brain, label: "AI Powered", value: "Smart" },
    { icon: Zap, label: "Instant", value: "Search" },
    { icon: TrendingUp, label: "Learn", value: "Faster" },
    { icon: GraduationCap, label: "Course", value: "Ready" },
];

export function DashboardHero({ displayName }: DashboardHeroProps) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 dark:from-primary/10 dark:via-purple-500/10 dark:to-pink-500/10">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -right-24 size-64 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 blur-3xl" />
            </div>

            <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-2 lg:gap-8 lg:p-10">
                {/* Left content */}
                <div className="flex flex-col justify-center">
                    <Badge
                        variant="primary"
                        className="mb-4 w-fit px-3 py-1 text-xs font-semibold shadow-lg shadow-primary/20"
                    >
                        <Sparkles className="mr-1.5 size-3" />
                        AI-Powered Learning
                    </Badge>

                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                        Welcome back,{" "}
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            {displayName || "Student"}
                        </span>{" "}
                        👋
                    </h1>

                    <p className="mt-3 text-sm text-muted-foreground sm:text-base lg:text-lg leading-relaxed max-w-lg">
                        Your AI-powered course companion helps you explore
                        materials, generate notes, validate code, and chat with
                        your course content.
                    </p>

                    {/* Quick stats */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {quickStats.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex flex-col items-center rounded-xl border border-border/50 bg-background/50 p-3 backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-background/80"
                            >
                                <stat.icon className="mb-1.5 size-5 text-primary" />
                                <span className="text-xs font-bold text-foreground">
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
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-2xl" />
                        <LottieAnimation
                            animationData={chatbotAnimation}
                            className="relative size-48 sm:size-56 lg:size-72"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
