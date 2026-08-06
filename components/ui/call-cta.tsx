"use client";

import { useLeadForm } from "@/components/providers/lead-form-provider";
import { Magnetic } from "@/components/ui/magnetic";
import { LiquidButton } from "@/components/ui/liquid-button";
import { cn } from "@/lib/utils";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The site's primary action. Repeated in the header, hero and closing section,
 * so it lives in one place — the label and behaviour stay identical everywhere.
 *
 * The primary variant is the liquid-fill button; `ghost` stays on the plain
 * house button, since two animated fills side by side in the hero would read as
 * two competing primary actions.
 */
export function CallCta({
  children = "Get a call within 5 minutes",
  variant = "signal",
  size,
  magnetic = true,
  className,
}: {
  children?: React.ReactNode;
  variant?: "signal" | "ghost";
  size?: "sm";
  magnetic?: boolean;
  className?: string;
}) {
  const { open } = useLeadForm();

  const button =
    variant === "signal" ? (
      <LiquidButton
        onClick={open}
        // tailwind-merge resolves these against the component's own h-12/px-6
        // rather than leaving both in the class list.
        className={cn(size === "sm" && "h-10 px-4 text-[0.8125rem]", className)}
      >
        {children}
        <ArrowIcon />
      </LiquidButton>
    ) : (
      <button
        type="button"
        onClick={open}
        className={cn("bx-btn bx-btn--ghost", size === "sm" && "bx-btn--sm", className)}
      >
        {children}
        <ArrowIcon />
      </button>
    );

  return magnetic ? <Magnetic>{button}</Magnetic> : button;
}
