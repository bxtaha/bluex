"use client";

import { useLeadForm } from "@/components/providers/lead-form-provider";
import { Magnetic } from "@/components/ui/magnetic";
import { cn } from "@/lib/utils";

/**
 * The site's primary action. Repeated in the header, hero and closing section,
 * so it lives in one place — the label and behaviour stay identical everywhere.
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

  const button = (
    <button
      type="button"
      onClick={open}
      className={cn(
        "bx-btn",
        variant === "signal" ? "bx-btn--signal" : "bx-btn--ghost",
        size === "sm" && "bx-btn--sm",
        className,
      )}
    >
      {children}
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
        <path
          d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return magnetic ? <Magnetic>{button}</Magnetic> : button;
}
