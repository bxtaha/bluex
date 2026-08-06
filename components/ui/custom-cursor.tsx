"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Two-part cursor: a dot that tracks exactly and a ring that trails behind and
 * swells over interactive elements.
 *
 * Never mounts on touch or coarse-pointer devices — hiding the OS cursor there
 * would leave some people with no pointer at all.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const apply = () => setEnabled(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // The class gates `cursor: none`, so the OS cursor only disappears once
    // the replacement is actually mounted and tracking.
    document.documentElement.classList.add("bx-has-cursor");

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "none" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "none" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3.out" });

    const onMove = (e: MouseEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    // Delegated rather than per-element listeners so it keeps working for
    // content that mounts later (dialogs, carousel panels).
    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select';
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      ring.dataset.hovering = String(!!target?.closest?.(INTERACTIVE));
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      document.documentElement.classList.remove("bx-has-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      gsap.killTweensOf([dot, ring]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="bx-cursor bx-cursor--ring" aria-hidden />
      <div ref={dotRef} className="bx-cursor bx-cursor--dot" aria-hidden />
    </>
  );
}
