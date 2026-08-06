"use client";

import * as React from "react";
import { useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Pulls its child toward the cursor while hovered, then springs back.
 *
 * Clones the child rather than wrapping it in a div: a wrapper would break the
 * flex/grid alignment of whatever it sits inside, and buttons need to stay the
 * direct layout child.
 */
export function Magnetic({
  children,
  strength = 0.35,
}: {
  children: React.ReactElement<{ ref?: React.Ref<HTMLElement> }>;
  /** Fraction of the cursor's offset from centre that the element follows. */
  strength?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Pointless and jittery on touch, where there is no hover state at all.
    const canHover = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    if (!canHover.matches) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength]);

  // Marks the element so the CSS hover-lift can stand down. GSAP writes an
  // inline transform here, which would beat the stylesheet rule anyway — this
  // makes that an explicit contract rather than a silent collision.
  return React.cloneElement(children, {
    ref,
    "data-magnetic": "",
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });
}
