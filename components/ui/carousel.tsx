"use client";

import * as React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-media-query";

export type CarouselSlide = {
  /** Stable key, and the basis of each slide's accessible name. */
  id: string;
  /** Announced as the slide's label, and used as the dot's button label. */
  label: string;
  /**
   * Which surface the slide paints. The controls read this and flip their own
   * colours — a dark dot is invisible on the white slide and a light one is
   * invisible on the glass one, and the controls sit over both.
   */
  tone?: "dark" | "light";
  content: React.ReactNode;
};

/**
 * A two-or-more slide carousel that moves one full slide at a time.
 *
 * The track is a flex row translated by whole multiples of 100%, which is the
 * reason the slides never disagree about height: they are laid out side by side
 * and the row stretches to the tallest, so advancing cannot resize the box or
 * shift what is under it. Position is a transform, so the movement is composited
 * and does not touch layout.
 *
 * Off-screen slides are `inert` as well as `aria-hidden` — a clipped slide still
 * holds focusable children otherwise, and tabbing would walk into content that
 * is not on screen. (`inert` is typed `boolean` in React 19, not `""`.)
 */
export function Carousel({
  slides,
  className,
  /** Seconds each slide holds before advancing. 0 disables autoplay. */
  interval = 9,
  ariaLabel,
  /**
   * Holds autoplay from outside — set while a dialog opened from a slide is up,
   * so the reader does not close it onto a different slide than the one they
   * opened it from.
   */
  paused: pausedExternally = false,
}: {
  slides: CarouselSlide[];
  className?: string;
  interval?: number;
  ariaLabel: string;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  // Three independent reasons to hold, kept apart rather than collapsed into
  // one flag: a single `paused` boolean means the last writer wins, and
  // returning to a backgrounded tab would clear a pause the pointer still owns.
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const paused = hovered || hidden || pausedExternally;
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // Autoplay. Off entirely under reduced motion — an unattended carousel is
  // motion the reader did not ask for, and this one is the whole card.
  useEffect(() => {
    if (reduced || paused || interval <= 0 || count < 2) return;

    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      interval * 1000,
    );
    return () => window.clearInterval(id);
  }, [reduced, paused, interval, count]);

  // A tab in the background should not burn frames advancing slides nobody is
  // looking at, and should not have raced ahead by the time it is returned to.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  const tone = slides[index]?.tone ?? "dark";

  return (
    <div
      ref={rootRef}
      className={cn("bx-carousel", className)}
      data-tone={tone}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(false);
      }}
    >
      <div className="bx-carousel__viewport">
        <div
          className="bx-carousel__track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="bx-carousel__slide"
              data-tone={slide.tone ?? "dark"}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${slide.label}`}
              aria-hidden={i !== index}
              inert={i !== index}
              id={`${baseId}-slide-${i}`}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="bx-carousel__arrow bx-carousel__arrow--prev"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
      >
        <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        className="bx-carousel__arrow bx-carousel__arrow--next"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
      >
        <ChevronRight className="size-5" strokeWidth={1.8} aria-hidden />
      </button>

      <div className="bx-carousel__dots">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className="bx-carousel__dot"
            data-active={i === index}
            aria-label={slide.label}
            aria-current={i === index}
            aria-controls={`${baseId}-slide-${i}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}
