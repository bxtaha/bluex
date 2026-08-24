import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LiquidButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Button whose fill rises like liquid on hover or focus.
 *
 * Two changes from the source: the keyframes live in globals.css rather than an
 * inline <style> tag, because this button renders several times per page and
 * each instance would otherwise inject a duplicate copy of the same rules; and
 * classes merge through `cn()` so a caller passing `h-10` actually overrides
 * `h-12` — plain string concatenation leaves both in play, and which one wins
 * is decided by stylesheet order rather than by the caller.
 *
 * Colours follow the site palette instead of the source's cyan/indigo.
 *
 * **Every animation here is paused until the button is hovered or focused**,
 * and that is a performance fix, not a style choice. The two wave layers and
 * the three bubbles are all `infinite`, and none of them is visible at rest:
 * the waves live inside a span parked at `top-[96%]` that only slides into
 * view on hover, and the bubbles are `opacity-0` until then. Left running they
 * were five permanently-composited, permanently-ticking layers per instance —
 * and this button renders six times on the homepage including inside the fixed
 * header, so thirty infinite animations were running from first paint for
 * something nobody could see. `animation-play-state` starts them at the same
 * instant they become visible; the 700ms fill transition covers the fact that
 * they begin at their first keyframe rather than mid-cycle.
 */
function LiquidButton({
  children,
  className,
  type = "button",
  ...props
}: LiquidButtonProps) {
  return (
    <button
      className={cn(
        "group/liquid relative isolate inline-flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-electric/40 bg-void px-6 text-sm font-semibold whitespace-nowrap text-white shadow-[0_12px_32px_-14px_rgba(46,107,255,0.8)] transition-[transform,box-shadow,border-color] duration-300 outline-none select-none",
        "hover:border-electric-glow/70 hover:shadow-[0_16px_40px_-12px_rgba(77,139,255,0.95)]",
        "focus-visible:border-electric-glow focus-visible:ring-3 focus-visible:ring-electric/35",
        "active:translate-y-px active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
        className,
      )}
      type={type}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute -inset-x-1/4 top-[96%] z-0 h-[190%] bg-gradient-to-b from-electric-glow via-electric to-[#1b3fb8] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/liquid:-translate-y-[58%] group-focus-visible/liquid:-translate-y-[58%] group-disabled/liquid:translate-y-0 motion-reduce:transition-none"
      >
        <span className="absolute top-0 left-1/2 size-[145%] -translate-x-1/2 -translate-y-1/2 [animation:liquid-button-wave_7s_linear_infinite] [animation-play-state:paused] rounded-[43%] bg-void/95 group-hover/liquid:[animation-play-state:running] group-focus-visible/liquid:[animation-play-state:running] motion-reduce:animate-none" />
        <span className="absolute top-0 left-1/2 size-[135%] -translate-x-1/2 -translate-y-1/2 [animation:liquid-button-wave_5s_linear_infinite_reverse] [animation-play-state:paused] rounded-[47%] bg-void/45 group-hover/liquid:[animation-play-state:running] group-focus-visible/liquid:[animation-play-state:running] motion-reduce:animate-none" />

        <span
          className="absolute bottom-4 left-[22%] size-1.5 [animation:liquid-button-bubble_1.8s_ease-in_infinite] [animation-play-state:paused] rounded-full bg-white/70 opacity-0 group-hover/liquid:opacity-100 group-hover/liquid:[animation-play-state:running] group-focus-visible/liquid:[animation-play-state:running] group-disabled/liquid:hidden motion-reduce:hidden"
          style={{ animationDelay: "120ms" }}
        />
        <span
          className="absolute bottom-2 left-[48%] size-2 [animation:liquid-button-bubble_2.2s_ease-in_infinite] [animation-play-state:paused] rounded-full bg-white/60 opacity-0 group-hover/liquid:opacity-100 group-hover/liquid:[animation-play-state:running] group-focus-visible/liquid:[animation-play-state:running] group-disabled/liquid:hidden motion-reduce:hidden"
          style={{ animationDelay: "520ms" }}
        />
        <span
          className="absolute bottom-5 left-[72%] size-1 [animation:liquid-button-bubble_1.6s_ease-in_infinite] [animation-play-state:paused] rounded-full bg-white/80 opacity-0 group-hover/liquid:opacity-100 group-hover/liquid:[animation-play-state:running] group-focus-visible/liquid:[animation-play-state:running] group-disabled/liquid:hidden motion-reduce:hidden"
          style={{ animationDelay: "860ms" }}
        />
      </span>

      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-5 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
    </button>
  );
}

export { LiquidButton };
export type { LiquidButtonProps };
