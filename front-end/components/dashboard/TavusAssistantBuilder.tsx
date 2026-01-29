"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Play, Video, MessageCircle } from "lucide-react";

interface TavusAssistantBuilderProps {
    userName: string;
    userEmail: string;
}

const TUTOR_TYPES = [
    {
        id: "funny",
        name: "Funny Tutor",
        description: "A cheerful and humorous AI tutor that makes learning fun",
        gradient: "from-pink-500 to-rose-400",
    },
    {
        id: "strict",
        name: "Strict Tutor",
        description:
            "A focused and disciplined AI tutor for serious study sessions",
        gradient: "from-indigo-500 to-blue-400",
    },
];

export function TavusAssistantBuilder({
    userName,
    userEmail,
}: TavusAssistantBuilderProps) {
    const [activeSession, setActiveSession] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    const handleStartSession = async (tutorId: string, tutorName: string) => {
        setIsStarting(true);

        // Simulate session start
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setActiveSession(tutorId);
        setIsStarting(false);

        // In production, this would launch the Tavus CVI
        alert(
            `Starting live session with ${tutorName}...\n\nThis would launch the Tavus Conversational Video Interface.`,
        );
    };

    const handleEndSession = () => {
        setActiveSession(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 shadow-lg shadow-violet-500/30">
                        <Video className="size-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                            Live AI Tutor
                        </h1>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            Connect with AI-powered tutors for personalized
                            learning sessions
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="primary" className="gap-1">
                        <Sparkles className="size-3" />
                        AI-Powered
                    </Badge>
                    <Badge variant="default" className="gap-1">
                        <Video className="size-3" />
                        Live Video
                    </Badge>
                    <Badge variant="default" className="gap-1">
                        <MessageCircle className="size-3" />
                        Interactive
                    </Badge>
                </div>
            </div>

            {/* Active Session */}
            {activeSession ? (
                <Card className="border-2 bg-gradient-to-br from-violet-500/5 to-purple-400/5">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-green-500 animate-pulse" />
                                <CardTitle>Active Session</CardTitle>
                            </div>
                            <Badge variant="primary">Live</Badge>
                        </div>
                        <CardDescription>
                            Your session with{" "}
                            {
                                TUTOR_TYPES.find((t) => t.id === activeSession)
                                    ?.name
                            }{" "}
                            is active
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Video placeholder */}
                        <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center border-2 border-border">
                            <div className="text-center space-y-3">
                                <Video className="size-16 text-muted-foreground mx-auto opacity-50" />
                                <p className="text-sm text-muted-foreground">
                                    Live session with{" "}
                                    {
                                        TUTOR_TYPES.find(
                                            (t) => t.id === activeSession,
                                        )?.name
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleEndSession}
                                className="flex-1"
                            >
                                End Session
                            </Button>
                            <Button className="flex-1 bg-gradient-to-r from-violet-500 to-purple-400">
                                <MessageCircle className="size-4 mr-2" />
                                Chat
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* No Active Session */
                <Card className="border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="size-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-400/20 flex items-center justify-center mb-6">
                            <MessageCircle className="size-10 text-violet-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                            No Active Session
                        </h3>
                        <p className="text-sm text-muted-foreground mb-8 max-w-md">
                            Start a new session below. Get real-time help with
                            your studies and master any subject.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Tutor Types */}
            {!activeSession && (
                <>
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Bot className="size-5 text-primary" />
                            Start New Session
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {TUTOR_TYPES.map((tutor) => (
                                <Card
                                    key={tutor.id}
                                    className="border-2 hover:shadow-lg transition-all group cursor-pointer"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div
                                                className={`size-12 rounded-xl bg-gradient-to-br ${tutor.gradient} p-3 shadow-lg flex-shrink-0`}
                                            >
                                                <Bot className="size-6 text-white" />
                                            </div>
                                            <Badge
                                                variant="default"
                                                className="text-xs"
                                            >
                                                Available
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">
                                            {tutor.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm">
                                            {tutor.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            onClick={() =>
                                                handleStartSession(
                                                    tutor.id,
                                                    tutor.name,
                                                )
                                            }
                                            disabled={isStarting}
                                            className={`w-full bg-gradient-to-r ${tutor.gradient} hover:shadow-lg transition-all`}
                                        >
                                            <Play className="size-4 mr-2" />
                                            {isStarting
                                                ? "Starting..."
                                                : "Start Session"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* SmartBot Multi Character */}
                    <Card className="border-2 border-dashed bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-5 text-amber-500" />
                                <CardTitle>SmartBot Multi Character</CardTitle>
                            </div>
                            <CardDescription>
                                Advanced AI tutor with multiple teaching styles
                                and personalities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full border-2 hover:bg-amber-500/10 hover:border-amber-500/30"
                                disabled
                            >
                                <Bot className="size-4 mr-2" />
                                Coming Soon
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Saving Current Feedback */}
                    <Card className="border-2 border-dashed bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MessageCircle className="size-5 text-emerald-500" />
                                <CardTitle>Saving Current Feedback</CardTitle>
                            </div>
                            <CardDescription>
                                Review and save feedback from your learning
                                sessions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full border-2 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                                disabled
                            >
                                View Feedback
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Info */}
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-violet-500/5 via-purple-400/5 to-pink-500/5">
                <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8">
                    <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 p-4 shadow-xl shadow-violet-500/25">
                        <Sparkles className="size-8 text-white" />
                    </div>
                    <div className="text-center sm:text-left space-y-2">
                        <h3 className="text-lg font-bold text-foreground">
                            Get real-time help with your studies
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                            Experience interactive AI tutoring sessions with
                            lifelike video conversations. Get instant answers,
                            personalized guidance, and master any subject with
                            our AI-powered tutors.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
