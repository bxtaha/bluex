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

    /**
     * The element's centre, measured once per hover rather than per move.
     *
     * `getBoundingClientRect` forces a style+layout flush, and this ran on
     * every `mousemove` — up to 1000/s on a high-polling mouse — against an
     * element GSAP is writing a transform to on the same frames. That is also
     * a feedback loop: the rect it returned included the pull already applied,
     * so the measured centre chased the element it was moving. Measuring on
     * entry fixes both, and gives the effect what it always meant to use — the
     * resting centre, not the drifted one.
     */
    let centre: { x: number; y: number } | null = null;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Undo any pull already applied, so the centre is the resting one even
      // when the pointer re-enters mid-spring-back.
      const applied = gsap.getProperty(el, "x") as number;
      const appliedY = gsap.getProperty(el, "y") as number;
      centre = {
        x: rect.left + rect.width / 2 - applied,
        y: rect.top + rect.height / 2 - appliedY,
      };
    };

    const onMove = (e: MouseEvent) => {
      if (!centre) measure();
      if (!centre) return;
      xTo((e.clientX - centre.x) * strength);
      yTo((e.clientY - centre.y) * strength);
    };

    const onEnter = () => measure();

    const onLeave = () => {
      centre = null;
      xTo(0);
      yTo(0);
    };

    // A page that scrolls under a held hover moves the element without a
    // `mousemove`, so the cached centre has to be dropped and re-measured.
    const invalidate = () => {
      centre = null;
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
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
