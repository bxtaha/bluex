"use client";

import * as React from "react";
import { useRef } from "react";
import { gsap, SplitText, MOTION_QUERIES } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type RevealTextProps = {
  children: React.ReactNode;
  /** Rendered element. Headings should pass their real level for a11y. */
  as?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  /** Seconds to wait after the trigger fires. */
  delay?: number;
  /** Play on mount instead of on scroll. Use for above-the-fold content. */
  immediate?: boolean;
};

/**
 * Reveals its text one line at a time, each line rising from behind its own
 * clipping edge.
 *
 * SplitText re-measures on resize, which reflows lines — the split is reverted
 * and rebuilt by gsap.matchMedia when the breakpoint changes so lines never end
 * up masked at the wrong height.
 */
export function RevealText({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  immediate = false,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      const split = new SplitText(el, {
        type: "lines",
        linesClass: "bx-line-mask",
      });

      // SplitText's line divs are the masks; the inner span is what moves.
      const inner = split.lines.map((line) => {
        const wrap = document.createElement("span");
        wrap.style.display = "block";
        wrap.style.willChange = "transform";
        while (line.firstChild) wrap.appendChild(line.firstChild);
        line.appendChild(wrap);
        return wrap;
      });

      const tween = gsap.from(inner, {
        yPercent: 115,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        delay,
        ...(immediate
          ? {}
          : {
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                once: true,
              },
            }),
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        split.revert();
      };
    });

    // Reduced motion: no split, no transform — the text is simply present.
    return () => ctx.revert();
  }, [delay, immediate]);

  return React.createElement(
    Tag,
    { ref, className: cn(className) },
    children,
  );
}
