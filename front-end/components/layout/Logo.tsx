 "use client";

import Image from "next/image";
import React from "react";

type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  variant?: "auto" | "light" | "dark";
};

type LogoPropsSimple = {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

export function Logo({ width = 40, height = 40, className = "", alt = "Orion logo" }: LogoPropsSimple) {
  // Always use the provided Gemini image as the single logo.
  return (
    <div className={`inline-flex items-center justify-center ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Gemini_Generated_Image_1n7zgl1n7zgl1n7z.png"
        alt={alt}
        width={width}
        height={height}
        className="object-contain"
        style={{ width, height }}
      />
    </div>
  );
}

export default Logo;

