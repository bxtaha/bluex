"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-media-query";

/**
 * Two intersecting spheres drawn as point clouds.
 *
 * Canvas 2D rather than three.js: the effect is unlit point sprites with no
 * materials, lighting or depth testing, which is the part of a 3D engine you
 * would actually be paying for. Two properties make the 2D version equivalent
 * rather than a compromise:
 *
 *   1. Additive blending is order-independent, so the points never need depth
 *      sorting — and it produces the bright bloom where the two spheres cross.
 *   2. One radial-gradient sprite, rendered once at startup and blitted per
 *      point, does the same job as a fragment shader's gl_PointCoord falloff.
 *
 * Three.js + react-three-fiber would add ~262KB gzipped for this alone.
 */

/** Golden angle — the distribution that avoids clumping at the poles. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Camera distance in radius units. Lower = more dramatic perspective. */
const FOV = 3.4;

/** Sprite bitmap size. Larger looks softer but costs fill rate. */
const SPRITE_PX = 32;

/** See the `frame` loop. A 44-second rotation does not need 60 samples a second. */
const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/**
 * Points per sphere on a small screen.
 *
 * A phone is both the least able to afford 1,200 additive blits per sphere and
 * the device where the orb is physically smallest, so the point cloud is the
 * densest per visible pixel — the composition survives the cut easily.
 */
const SMALL_SCREEN_DENSITY = 600;
const SMALL_SCREEN_MAX_WIDTH = 768;

type Sphere = {
  points: Float32Array;
  sprite: HTMLCanvasElement | null;
  /** Centre offset in radius units. */
  ox: number;
  oy: number;
  color: string;
  phase: number;
};

function fibonacciSphere(count: number): Float32Array {
  const pts = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;
    pts[i * 3] = Math.cos(theta) * r;
    pts[i * 3 + 1] = y;
    pts[i * 3 + 2] = Math.sin(theta) * r;
  }
  return pts;
}

/** A soft round dot baked once, then blitted thousands of times per frame. */
function makeSprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_PX;
  canvas.height = SPRITE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const half = SPRITE_PX / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.25, color);
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  return canvas;
}

export default function ParticleOrb({
  className,
  /** Points per sphere. 1200 holds 60fps comfortably on a laptop. */
  density = 1200,
  colorA = "#4d8bff",
  colorB = "#f5f1e8",
  /** Seconds per full rotation. Slow reads as expensive. */
  period = 44,
}: {
  className?: string;
  density?: number;
  colorA?: string;
  colorB?: string;
  period?: number;
}) {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const spheresRef = useRef<Sphere[]>([]);

  const draw = useCallback((elapsed: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    // Additive: overlapping dots sum toward white, which is what makes the
    // intersection glow. Also removes any need to sort points by depth.
    ctx.globalCompositeOperation = "lighter";

    // The orb is sized to bleed past the edges, as in a hero composition.
    const radius = Math.min(w, h) * 0.46;
    const cx = w / 2;
    const cy = h / 2;

    const spin = (elapsed / (period * 1000)) * Math.PI * 2;
    const tilt = -0.42;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    for (const sphere of spheresRef.current) {
      const { points, sprite, ox, oy, phase } = sphere;
      if (!sprite) continue;

      const angle = spin + phase;
      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);

      for (let i = 0; i < points.length; i += 3) {
        const px = points[i];
        const py = points[i + 1];
        const pz = points[i + 2];

        // Yaw, then a fixed tilt so the poles are never square to camera.
        const x1 = px * cosY + pz * sinY;
        const z1 = pz * cosY - px * sinY;
        const y2 = py * cosT - z1 * sinT;
        const z2 = py * sinT + z1 * cosT;

        // Perspective divide. Points nearer the camera scale up and brighten.
        const scale = FOV / (FOV + z2);
        const sx = cx + (x1 + ox) * scale * radius;
        const sy = cy + (y2 + oy) * scale * radius;

        // z2 runs -1..1; remap to a depth fade so the far hemisphere recedes
        // instead of reading as a flat disc of identical dots.
        const depth = (z2 + 1) * 0.5;
        const alpha = 0.12 + depth * 0.78;
        const size = (1.4 + depth * 2.6) * scale;

        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, sx - size, sy - size, size * 2, size * 2);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [period]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    // Halved on phones — see SMALL_SCREEN_DENSITY. Read here rather than passed
    // as a prop so every caller gets it without having to know about it.
    const points =
      window.innerWidth < SMALL_SCREEN_MAX_WIDTH
        ? Math.min(density, SMALL_SCREEN_DENSITY)
        : density;

    spheresRef.current = [
      { points: fibonacciSphere(points), sprite: makeSprite(colorA), ox: -0.30, oy: 0, color: colorA, phase: 0 },
      { points: fibonacciSphere(points), sprite: makeSprite(colorB), ox: 0.30, oy: 0, color: colorB, phase: Math.PI * 0.6 },
    ];

    const setSize = () => {
      const { width, height } = host.getBoundingClientRect();
      // Capped at 2: beyond that the fill cost doubles for no visible gain on
      // soft, low-contrast dots.
      // 1.5, not 2. These are soft, low-contrast, heavily-overlapping dots —
      // there is no edge for the extra resolution to sharpen, and the fill cost
      // scales with the square of this number.
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (w === sizeRef.current.w && h === sizeRef.current.h && dpr === sizeRef.current.dpr) {
        return;
      }
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h, dpr };
    };

    setSize();
    const resizeObserver = new ResizeObserver(() => {
      setSize();
      draw(performance.now());
    });
    resizeObserver.observe(host);

    // A still frame carries the composition without any motion at all.
    if (reduced) {
      draw(0);
      return () => resizeObserver.disconnect();
    }

    let running = false;
    let lastDrawn = 0;

    /**
     * Capped at `TARGET_FPS`, not the display's refresh rate.
     *
     * Each frame issues one `globalAlpha` write and one additive `drawImage`
     * per point — 2,400 of them across the two spheres — and additive
     * compositing is a slow path when there is no GPU raster to fall back on.
     * The motion being bought is a 44-second revolution: 0.14 degrees per
     * frame at 60fps, which no eye resolves. Drawing at 30 halves the work for
     * a rotation that still reads as perfectly smooth, and on a 120Hz display
     * it is a four-fold saving.
     *
     * `draw` derives its phase from the absolute timestamp rather than
     * accumulating deltas, so skipping frames leaves the animation's speed and
     * position exactly correct — it simply samples the same curve less often.
     */
    const frame = (now: number) => {
      if (now - lastDrawn >= FRAME_INTERVAL_MS) {
        lastDrawn = now;
        draw(now);
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafRef.current = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafRef.current);
    };

    // Same discipline as the hero grid: thousands of blits per frame must not
    // run while the section is off screen or the tab is hidden.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "160px" },
    );
    visibility.observe(host);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (host.getBoundingClientRect().bottom > 0) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, [density, colorA, colorB, draw, reduced]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
