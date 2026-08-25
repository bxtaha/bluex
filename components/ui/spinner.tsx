import { cn } from "@/lib/utils";

/**
 * The site's progress indicator.
 *
 * The visual is entirely `.bx-spinner` in globals.css — see the note there for
 * why it survives the blanket reduced-motion rule instead of being frozen by
 * it. This exists for the accessibility half, which is the part that is easy
 * to get subtly wrong in two different ways depending on where the spinner
 * sits:
 *
 * - **Beside its own label** (`<Spinner /> Starting the call…` inside a
 *   button). The text already announces the state, so the ring must be
 *   `aria-hidden` — otherwise a screen reader hears the status twice, once
 *   from the live region and once from the button's accessible name.
 * - **Alone**, standing in for content that has not arrived. Then it is the
 *   only thing there is to announce, so it needs `role="status"` and a label
 *   of its own, or the page is silent for as long as it takes to load.
 *
 * `label` is what picks between them: pass one and it announces, omit it and
 * it is decoration next to whatever text you have written yourself. Defaulting
 * to silent is the safer half — a duplicated announcement is a bug you cannot
 * see, while a missing one is caught the moment anybody tests with a reader.
 */
export function Spinner({
  label,
  className,
}: {
  /** Announce the wait. Omit when adjacent text already says it. */
  label?: string;
  className?: string;
}) {
  if (!label) {
    return <span className={cn("bx-spinner", className)} aria-hidden />;
  }

  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span className={cn("bx-spinner", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
