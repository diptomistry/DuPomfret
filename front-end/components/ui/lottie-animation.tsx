"use client";

import Lottie from "lottie-react";
import { useMounted } from "@/hooks/useMounted";

interface LottieAnimationProps {
    animationData: object;
    className?: string;
    loop?: boolean;
    autoplay?: boolean;
}

export function LottieAnimation({
    animationData,
    className = "",
    loop = true,
    autoplay = true,
}: LottieAnimationProps) {
    const mounted = useMounted();

    if (!mounted) {
        return <div className={className} />;
    }

    return (
        <Lottie
            animationData={animationData}
            loop={loop}
            autoplay={autoplay}
            className={className}
        />
    );
}
