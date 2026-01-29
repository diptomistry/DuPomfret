import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import { Sparkles, Search, BookOpen, MessageCircle, ArrowRight, Zap, Brain, Code2, GraduationCap } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Smart Content Hub",
    description: "Upload and organize lecture slides, PDFs, code, and notes with intelligent metadata tagging.",
    gradient: "from-blue-500 to-cyan-400",
    shadowColor: "shadow-blue-500/20",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Find exactly what you need with natural language queries across all your course materials.",
    gradient: "from-purple-500 to-pink-500",
    shadowColor: "shadow-purple-500/20",
  },
  {
    icon: Sparkles,
    title: "AI Generation",
    description: "Create study notes, slide outlines, and code examples grounded in your syllabus content.",
    gradient: "from-orange-500 to-amber-400",
    shadowColor: "shadow-orange-500/20",
  },
  {
    icon: MessageCircle,
    title: "AI Tutor Chat",
    description: "Get instant answers from an AI assistant that deeply understands your course content.",
    gradient: "from-emerald-500 to-teal-400",
    shadowColor: "shadow-emerald-500/20",
  },
];

const stats = [
  { icon: Brain, value: "AI-Powered", label: "Smart Assistance" },
  { icon: Zap, value: "Instant", label: "Search Results" },
  { icon: Code2, value: "Code", label: "Validation" },
  { icon: GraduationCap, value: "Course", label: "Grounded" },
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
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="primary" className="mb-6 px-4 py-1.5 text-sm font-medium shadow-lg shadow-primary/20">
                <Sparkles className="mr-1.5 size-3.5" />
                AI-Powered Learning Platform
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                Your{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    AI Course
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 10C50 4 150 4 298 10" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="underline-gradient" x1="0" y1="0" x2="300" y2="0">
                        <stop offset="0%" stopColor="oklch(0.55 0.18 260)" />
                        <stop offset="50%" stopColor="oklch(0.65 0.25 300)" />
                        <stop offset="100%" stopColor="oklch(0.7 0.25 330)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <br />
                <span className="text-foreground">Companion</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl lg:text-2xl leading-relaxed">
                One place for your course slides, PDFs, lab code, and notes – with 
                <span className="font-semibold text-foreground"> semantic search</span>, 
                <span className="font-semibold text-foreground"> AI generation</span>, and 
                <span className="font-semibold text-foreground"> chat tutor</span>.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-105">
                  <Link href={ROUTES.LOGIN}>
                    Get Started Free
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-medium border-2 hover:bg-muted/50">
                  <Link href={ROUTES.DASHBOARD}>Explore Dashboard</Link>
                </Button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 lg:mt-20">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-card/80 hover:border-primary/30">
                  <stat.icon className="mb-2 size-6 text-primary" />
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

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
                Powerful AI tools designed specifically for university students.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl transition-all duration-500 hover:border-transparent hover:shadow-2xl ${feature.shadowColor} dark:bg-card/40 sm:p-8`}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-5 dark:group-hover:opacity-10`} />
                  
                  {/* Icon with gradient background */}
                  <div className={`relative mb-5 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-3.5 shadow-lg ${feature.shadowColor} transition-transform duration-300 group-hover:scale-110`}>
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
                    Learn more <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-1" />
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
                Join students who are already learning smarter with AI-powered study tools.
              </p>
              <Button asChild size="lg" className="relative mt-8 h-12 px-8 text-base font-semibold shadow-xl shadow-primary/25">
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
            Built for students who want to learn smarter, not harder.
          </p>
        </footer>
      </main>
    </div>
  );
}