"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StardustButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const buttonStyle = {
  "--white": "#e6f3ff",
  "--bg": "#0a1929",
  "--radius": "100px",
  borderRadius: "var(--radius)",
  backgroundColor: "var(--bg)",
  boxShadow: `
    inset 0 0.3rem 0.9rem rgba(255, 255, 255, 0.3),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
    inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.5),
    0 3rem 3rem rgba(0, 0, 0, 0.3),
    0 1rem 1rem -0.6rem rgba(0, 0, 0, 0.8)
  `,
} as React.CSSProperties;

const textStyle: React.CSSProperties = {
  color: "rgba(129, 216, 255, 0.9)",
};

const pStyle: React.CSSProperties = {
  maskImage:
    "linear-gradient(to bottom, rgba(129, 216, 255, 1) 40%, transparent)",
};

export function StardustButton({
  children = "Launching Soon",
  className,
  ...props
}: StardustButtonProps) {
  return (
    <div className="relative inline-flex">
      {/* Animated glow that continuously orbits the button */}
      <div
        className="stardust-halo pointer-events-none absolute -inset-4 -z-10 rounded-full blur-xl"
        aria-hidden="true"
      />

      <button
        type="button"
        className={cn(
          "pearl-button relative cursor-pointer border-0 outline-none transition-all duration-200",
          className,
        )}
        style={buttonStyle}
        {...props}
      >
        <div
          className="wrap relative overflow-hidden rounded-[inherit] px-8 py-4 text-base font-medium sm:px-10 sm:py-5 sm:text-lg"
          style={textStyle}
        >
          <p
            className="m-0 flex translate-y-[2%] items-center gap-2 transition-all duration-200"
            style={pStyle}
          >
            <span>✧</span>
            <span>✦</span>
            {children}
          </p>
        </div>
      </button>
    </div>
  );
}
