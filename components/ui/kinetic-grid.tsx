"use client";

import { useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 55; // Desktop-ish size. Will dictate cols/rows
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;

const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.13 };
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

const LINE_BASE_STYLE = `rgba(${LINE_BASE.r},${LINE_BASE.g},${LINE_BASE.b},${LINE_BASE.a})`;
const NODE_BASE_STYLE = "rgba(255,255,255,0.2)";
const IDLE_EPSILON = 0.001;
const BG_COLOR = "#161618";
const DEFAULT_ACCENT = "#4a9eff";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function lerpColor(
  base: { r: number; g: number; b: number; a: number },
  active: { r: number; g: number; b: number; a: number },
  t: number,
): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KineticGrid({
  children,
  className,
  accentColor = DEFAULT_ACCENT,
}: {
  children?: ReactNode;
  className?: string;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Read by draw() every frame so accent-color changes take effect
  // immediately without tearing down and restarting the animation loop.
  const accentColorRef = useRef(accentColor);
  useEffect(() => {
    accentColorRef.current = accentColor;
  }, [accentColor]);

  // Static background (solid fill + dot texture) is cached here and only
  // repainted on resize/theme change instead of every animation frame.
  const bgBufferRef = useRef<HTMLCanvasElement | null>(null);

  // The warped point grid is reused across frames (mutated in place) instead
  // of being reallocated every frame, to avoid constant GC churn.
  const gridDimsRef = useRef<{ cols: number; rows: number }>({
    cols: 0,
    rows: 0,
  });
  const ptsRef = useRef<Point[]>([]);
  const proxRef = useRef<Float32Array>(new Float32Array(0));

  // ── Warp ────────────────────────────────────────────────────────────────────

  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
      out: Point,
    ): number => {
      // Edge pin — smoothly locks boundary rows/cols in place
      const edgeMargin = 1.5;
      const colPin = Math.min(
        col / edgeMargin,
        (cols - 1 - col) / edgeMargin,
        1,
      );
      const rowPin = Math.min(
        row / edgeMargin,
        (rows - 1 - row) / edgeMargin,
        1,
      );
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      // Ripple displacement
      let rx = 0,
        ry = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const strength =
            (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      // Cursor warp with bell falloff
      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        out.x = gx - Math.cos(angle) * warpAmt + rx;
        out.y = gy - Math.sin(angle) * warpAmt + ry;
        return proximity;
      }

      out.x = gx + rx;
      out.y = gy + ry;
      return proximity;
    },
    [],
  );

  // ── Static background (solid fill + dot texture) ───────────────────────────

  const paintStaticBackground = useCallback(() => {
    const { w: W, h: H } = sizeRef.current;
    let buffer = bgBufferRef.current;
    if (!buffer) {
      buffer = document.createElement("canvas");
      bgBufferRef.current = buffer;
    }
    buffer.width = W;
    buffer.height = H;
    const bctx = buffer.getContext("2d");
    if (!bctx) return;

    bctx.fillStyle = BG_COLOR;
    bctx.fillRect(0, 0, W, H);

    bctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
      for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
        bctx.beginPath();
        bctx.arc(x, y, 0.7, 0, Math.PI * 2);
        bctx.fill();
      }
    }
  }, []);

  // ── Draw ────────────────────────────────────────────────────────────────────

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;

      const accent = hexToRgb(accentColorRef.current);
      const accentCss = `${accent.r},${accent.g},${accent.b}`;
      const theme = {
        lineActive: { ...accent, a: 0.9 },
        nodeActive: { ...accent, a: 1.0 },
        glow: accentCss,
        ripple: accentCss,
      };

      ctx.clearRect(0, 0, W, H);

      // Background (pre-rendered once on resize/theme change, not per frame)
      if (bgBufferRef.current) {
        ctx.drawImage(bgBufferRef.current, 0, 0);
      }

      // Update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        // FIX: Ensure radius is never negative
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      // ── Build warped grid (reusing buffers across frames) ────────────────
      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const dims = gridDimsRef.current;
      const cellCount = cols * rows;
      if (dims.cols !== cols || dims.rows !== rows) {
        dims.cols = cols;
        dims.rows = rows;
        const pts: Point[] = new Array(cellCount);
        for (let i = 0; i < cellCount; i++) pts[i] = { x: 0, y: 0 };
        ptsRef.current = pts;
        proxRef.current = new Float32Array(cellCount);
      }
      const pts = ptsRef.current;
      const prox = proxRef.current;

      const idx = (row: number, col: number) => row * cols + col;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = idx(row, col);
          prox[i] = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
            pts[i],
          );
        }
      }

      // ── Grid lines ────────────────────────────────────────────────────────
      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2;
        const t = avg * avg * (3 - 2 * avg); // smoothstep
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        if (t < IDLE_EPSILON) {
          ctx.strokeStyle = LINE_BASE_STYLE;
          ctx.lineWidth = 0.8;
        } else {
          ctx.strokeStyle = lerpColor(LINE_BASE, theme.lineActive, t);
          ctx.lineWidth = lerpN(0.8, 1.5, t);
        }
        ctx.stroke();
      };

      ctx.lineCap = "butt";

      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(
            pts[idx(row, col)],
            pts[idx(row, col + 1)],
            prox[idx(row, col)],
            prox[idx(row, col + 1)],
          );

      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(
            pts[idx(row, col)],
            pts[idx(row + 1, col)],
            prox[idx(row, col)],
            prox[idx(row + 1, col)],
          );

      // ── Intersection nodes ────────────────────────────────────────────────
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[idx(row, col)];
          const pr = prox[idx(row, col)];
          const t = pr * pr * (3 - 2 * pr); // smoothstep
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

          // Outer glow ring for active nodes
          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(
              p.x,
              p.y,
              r * 0.5,
              p.x,
              p.y,
              glowR,
            );
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          // Node fill
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          if (t < IDLE_EPSILON) {
            ctx.fillStyle = NODE_BASE_STYLE;
          } else {
            ctx.fillStyle = lerpColor(
              { r: 255, g: 255, b: 255, a: 0.2 },
              theme.nodeActive,
              t,
            );
          }
          ctx.fill();
        }
      }

      // ── Ripple rings ──────────────────────────────────────────────────────
      for (const r of ripples) {
        // FIX: Ensure radius is positive before drawing arc
        const safeRadius = Math.max(0, r.radius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [getWarpedPoint],
  );

  // ── Setup ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };
      paintStaticBackground();
      if (mouseRef.current.x === -9999) {
        mouseRef.current = { x: -9999, y: -9999 };
        targetMouseRef.current = { x: -9999, y: -9999 };
      }
    };

    setSize();
    window.addEventListener("resize", setSize);

    const onMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onClick = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        opacity: 1,
        born: performance.now(),
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    function animate(now: number) {
      const m = mouseRef.current;
      const t = targetMouseRef.current;

      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);

      draw(now);
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw, paintStaticBackground]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "relative w-full min-h-screen overflow-hidden bg-[#161618]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
