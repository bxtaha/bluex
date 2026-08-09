"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, MOTION_QUERIES } from "@/lib/gsap";

/** Breathing room left after the final panel when the track is fully scrolled. */
const TRAIL = 96;

/** Movement, in px, before a swipe is judged horizontal or vertical. */
const AXIS_THRESHOLD = 8;

/** Share of its speed a flick keeps each frame after the finger lifts. */
const GLIDE_DECAY = 0.94;

/** Speed below which the glide has arrived, in px per frame. */
const GLIDE_MIN = 0.25;

type PinnedTrackOptions = {
  /**
   * Which way the content travels as the reader scrolls down.
   *
   * `false` — the track slides left, so panels arrive from the right edge and
   * the first one in the DOM is the first one seen. This is "What we build".
   *
   * `true` — the track slides right, so panels arrive from the left edge. The
   * viewport starts at the track's *right-hand* end, which means the markup
   * order and the reading order only agree if the track is laid out in reverse
   * as well: see `.bx-track--mirror` in globals.css, which does that with
   * `order` while leaving the DOM alone for screen readers and for the case
   * where this hook never runs.
   */
  reverse?: boolean;
};

/**
 * Pins a section and scrubs a horizontal track across it, one pixel of track
 * per pixel of scroll.
 *
 * Two sections do this — "What we build" and "Selected work" — and they used to
 * be one copy each. The mechanics are not the interesting part of either: the
 * pin distance, the axis-locking swipe and the flick glide are the same problem
 * both times, and the only thing that actually differs between them is which
 * way the track travels.
 *
 * `data-pinned="true"` goes on the section whenever the tween exists, and comes
 * off when it does not. That is the whole fallback story, and it is an attribute
 * rather than a media query because there are three separate ways to end up
 * without a scrub — reduced motion, no JavaScript, and a viewport wide enough
 * that the panels already fit — and a media query only covers the first. The
 * layout that depends on the pin (a viewport-height section, a track that does
 * not wrap) hangs off that attribute, so a track with nothing driving it is a
 * wrapping row of panels rather than a clipped one with its later panels
 * unreachable.
 */
export function usePinnedTrack(
  sectionRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
  { reverse = false }: PinnedTrackOptions = {},
) {
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.matchMedia();

    // Every width, not just desktop. Vertical scrolling drives the track
    // sideways on a phone exactly as it does on a laptop — the alternative was
    // a swipe carousel, which hid the later panels behind a gesture nobody
    // knows to make.
    ctx.add(MOTION_QUERIES.motion, () => {
      // `offsetLeft` and `scrollWidth` are layout values, unaffected by the
      // transform this tween is applying — reading getBoundingClientRect here
      // would feed the tween's own output back into its input on refresh.
      const distance = () => {
        const overflow =
          track.offsetLeft + track.scrollWidth - window.innerWidth + TRAIL;
        return Math.max(0, overflow);
      };

      // On a wide enough viewport the panels already fit, and there is nothing
      // to scrub. Pinning anyway would freeze the page against a zero-length
      // (or negative) timeline, so the section is simply left static.
      if (distance() === 0) return;

      const scrollTrigger = {
        trigger: section,
        start: "top top",
        // Pin for exactly as long as the track needs to travel, so scroll
        // distance and horizontal distance stay 1:1 at any viewport width.
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      };

      // Reversed, the track starts held one full travel to the left and comes
      // back to rest, which puts the viewport on its right-hand end to begin
      // with. `fromTo` rather than a negative `to`, because the starting offset
      // has to be applied before the trigger is ever reached — otherwise the
      // track sits at zero until the reader arrives and then jumps.
      const tween = reverse
        ? gsap.fromTo(
            track,
            { x: () => -distance() },
            { x: 0, ease: "none", scrollTrigger },
          )
        : gsap.to(track, { x: () => -distance(), ease: "none", scrollTrigger });

      // Only now, once there is definitely something to scrub. Everything the
      // pinned layout assumes — a viewport-height section, a track that runs
      // off the side rather than wrapping — is keyed off this.
      section.dataset.pinned = "true";

      // Swiping sideways moves the panels sideways. Scroll position is the only
      // thing that actually drives the track, so the drag does not touch the
      // track at all — it scrolls the page by the same distance the finger
      // travelled, and the pin turns that back into horizontal movement. One
      // source of truth, and letting go leaves scroll exactly where the panels
      // say it should be.
      const trigger = tween.scrollTrigger;

      // Dragging the content the way it already travels is scrolling forwards,
      // which is the opposite finger direction in a reversed track.
      const dragSign = reverse ? 1 : -1;

      let tracking = false;
      let horizontal: boolean | null = null;
      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastTime = 0;
      let velocity = 0;
      let glide = 0;

      const onPointerDown = (event: PointerEvent) => {
        // Mice and trackpads already scrub this by scrolling; hijacking a
        // click-drag there would break text selection for no gain.
        if (event.pointerType === "mouse") return;
        cancelAnimationFrame(glide);
        tracking = true;
        horizontal = null;
        startX = lastX = event.clientX;
        startY = event.clientY;
        lastTime = event.timeStamp;
        velocity = 0;
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!tracking) return;

        // Which way this gesture is going is decided once, after it has moved
        // far enough to mean something, and never revisited — otherwise a
        // diagonal swipe flickers between scrolling the page and dragging.
        if (horizontal === null) {
          const dx = Math.abs(event.clientX - startX);
          const dy = Math.abs(event.clientY - startY);
          if (dx < AXIS_THRESHOLD && dy < AXIS_THRESHOLD) return;
          horizontal = dx > dy;
          if (horizontal) track.setPointerCapture?.(event.pointerId);
        }
        if (!horizontal) return;

        const dx = event.clientX - lastX;
        const dt = event.timeStamp - lastTime;
        // Per frame rather than per millisecond, so the glide below can just
        // add it once per frame.
        if (dt > 0) velocity = ((dragSign * dx) / dt) * 16;
        lastX = event.clientX;
        lastTime = event.timeStamp;

        window.scrollBy(0, dragSign * dx);
      };

      const onPointerUp = () => {
        if (!tracking) return;
        const wasHorizontal = horizontal;
        tracking = false;
        horizontal = null;
        if (!wasHorizontal || Math.abs(velocity) < GLIDE_MIN) return;

        // A flick should coast. Native scrolling has momentum and a carousel
        // that stops dead the instant the finger lifts feels broken beside it.
        const step = () => {
          velocity *= GLIDE_DECAY;
          if (Math.abs(velocity) < GLIDE_MIN) return;
          window.scrollBy(0, velocity);
          glide = requestAnimationFrame(step);
        };
        glide = requestAnimationFrame(step);
      };

      // Only while the section owns the screen. Outside the pin the same drag
      // would scroll the page sideways-to-vertically for no visible reason.
      const guard = (handler: (event: PointerEvent) => void) => {
        return (event: PointerEvent) => {
          if (!trigger?.isActive) return;
          handler(event);
        };
      };

      const down = guard(onPointerDown);
      track.addEventListener("pointerdown", down);
      track.addEventListener("pointermove", onPointerMove);
      track.addEventListener("pointerup", onPointerUp);
      track.addEventListener("pointercancel", onPointerUp);

      return () => {
        cancelAnimationFrame(glide);
        track.removeEventListener("pointerdown", down);
        track.removeEventListener("pointermove", onPointerMove);
        track.removeEventListener("pointerup", onPointerUp);
        track.removeEventListener("pointercancel", onPointerUp);
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { x: 0 });
        delete section.dataset.pinned;
      };
    });

    // Fonts change text metrics, which changes track width, which changes the
    // pin distance. Without this the last panel can end up unreachable.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, [sectionRef, trackRef, reverse]);
}
