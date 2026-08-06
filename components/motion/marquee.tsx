import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite horizontal scroll, pure CSS.
 *
 * The track holds the item list twice and translates exactly -50%. At the end
 * of a cycle the second copy sits precisely where the first began, so the reset
 * is invisible — any other distance produces a visible jump. No JS, no rAF, and
 * it keeps running while the main thread is busy.
 *
 * The duplicate is `aria-hidden` so the items are not announced twice.
 */
export function Marquee({
  items,
  /** Seconds per full cycle. Slower reads as more expensive. */
  duration = 34,
  className,
  renderItem,
}: {
  items: string[];
  duration?: number;
  className?: string;
  renderItem?: (item: string) => React.ReactNode;
}) {
  const render = renderItem ?? ((item: string) => item);

  const group = (hidden: boolean) => (
    <ul className="bx-marquee__group" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="bx-marquee__item">
          {render(item)}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn("bx-marquee", className)}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
    >
      <div className="bx-marquee__track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}
