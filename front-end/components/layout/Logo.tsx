 "use client";

import Image from "next/image";
import React from "react";

type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

export function Logo({ width = 40, height = 40, className = "", alt = "Orion logo" }: LogoProps) {
  // Show light logo in light mode and Gemini image in dark mode using Tailwind dark classes.
  // The wrapping div keeps layout stable.
  return (
    <div className={`inline-flex items-center justify-center ${className}`} aria-hidden>
      {/* Light theme logo - visible when not dark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/light-logo.png"
        alt={alt}
        width={width}
        height={height}
        className="block dark:hidden object-contain"
        style={{ width, height }}
      />

      {/* Dark theme logo - visible when dark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Gemini_Generated_Image_1n7zgl1n7zgl1n7z.png"
        alt={alt}
        width={width}
        height={height}
        className="hidden dark:block object-contain"
        style={{ width, height }}
      />
    </div>
  );
}

export default Logo;

