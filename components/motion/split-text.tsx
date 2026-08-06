"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { observeOnce } from "@/lib/reveal";
import { cn } from "@/lib/utils";

/**
 * Masked word reveal: each word rises from behind its own clipping edge.
 *
 * Splitting text into spans hides it from assistive technology as a sentence —
 * screen readers announce a pile of fragments. The whole string is therefore
 * exposed once via `aria-label` and the pieces are marked `aria-hidden`, so the
 * heading reads as one phrase while still animating per word.
 *
 * Words are split at render, not measured in an effect, so the markup is
 * complete in the server HTML and the headline is readable before JS runs.
 */
export function SplitText({
  children,
  as: Tag = "h1",
  className,
  /** Delay before the first word, in ms. */
  delay = 0,
}: {
  children: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeOnce(el, () => el.setAttribute("data-revealed", "true"));
  }, []);

  const words = children.split(/\s+/).filter(Boolean);

  return React.createElement(
    Tag,
    {
      ref,
      "aria-label": children,
      className: cn("bx-split", className),
      style: { "--split-delay": `${delay}ms` } as React.CSSProperties,
    },
    words.map((word, i) => (
      <React.Fragment key={`${word}-${i}`}>
        {i > 0 ? " " : null}
        <span
          className="bx-word"
          aria-hidden
          style={{ "--word-i": i } as React.CSSProperties}
        >
          <span className="bx-word__inner">{word}</span>
        </span>
      </React.Fragment>
    )),
  );
}
