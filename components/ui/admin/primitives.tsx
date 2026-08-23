"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Check, Inbox, Loader2, X } from "lucide-react";

/**
 * Shared pieces for the admin area.
 *
 * These exist because eight panels had each grown their own card, their own
 * table header, their own "nothing here yet" and their own submit button, and
 * the copies had drifted — three radii, two shades of border and four spellings
 * of an empty state. A dashboard that looks assembled rather than designed is
 * usually not one bad decision; it is twenty small ones nobody made on purpose.
 *
 * The token discipline here is deliberate and narrow:
 *
 * - **Radius.** `rounded-xl` for panels, `rounded-lg` for controls, `rounded-md`
 *   for chips. Three values, chosen by the element's size, never by taste.
 * - **Accent.** `electric` (#2e6bff, the brand blue) and nothing else, used only
 *   for the current selection and the one primary action per screen. Everything
 *   that is merely available is gray. An accent that marks six things marks
 *   nothing.
 * - **Elevation.** One shadow, on panels. Depth used to signal grouping is depth
 *   that stops meaning anything once three levels exist.
 * - **Numbers are `tabular-nums`.** Counts here update live, and proportional
 *   digits change width as they do, so a badge going 9 → 10 nudges its
 *   neighbours. Barely visible once, and cheap to prevent everywhere.
 *
 * Motion is `motion-reduce:transition-none` throughout rather than relying on
 * the `prefers-reduced-motion` blocks in globals.css, which are written per
 * component and cannot see Tailwind utilities applied inline.
 */

/* ── Surfaces ─────────────────────────────────────────────────────────────── */

export function AdminCard({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * A heading for a block inside a panel.
 *
 * `as` exists so the visual weight and the document outline can be chosen
 * separately — a card heading that looks like a subheading should still be an
 * `h2` when it is the second level of the page, and hardcoding either one makes
 * the other wrong somewhere.
 */
export function AdminSectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Heading className="text-[0.9375rem] font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-electric text-white hover:bg-electric-glow focus-visible:outline-electric",
  secondary:
    "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-electric dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-electric dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
  // Red only on the button that actually destroys something. A red "Cancel"
  // beside it is how people click the wrong one.
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-500",
};

export function AdminButton({
  children,
  variant = "secondary",
  size = "md",
  pending = false,
  icon: Icon,
  type = "button",
  onClick,
  disabled = false,
  fullWidth = false,
  title,
}: {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  pending?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Also becomes the accessible name when there is no visible label. */
  title?: string;
}) {
  const iconOnly = !children && !!Icon;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      title={title}
      aria-label={iconOnly ? title : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none ${
        size === "sm"
          ? `h-8 text-[0.8125rem] ${iconOnly ? "w-8" : "px-2.5"}`
          : `h-10 text-sm ${iconOnly ? "w-10" : "px-3.5"}`
      } ${fullWidth ? "w-full" : ""} ${BUTTON_VARIANTS[variant]}`}
    >
      {pending ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="size-4 shrink-0" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

/**
 * A labelled input.
 *
 * The id is generated, so two of these cannot collide and quietly break the
 * label association — which would focus the wrong field on click and read the
 * wrong name aloud. `aria-describedby` is wired only when there is something to
 * describe: pointing it at an empty node makes assistive technology promise a
 * description and then say nothing.
 */
export function AdminField({
  label,
  value,
  onChange,
  type = "text",
  name,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  autoComplete,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
  name?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required ? (
          <span className="text-gray-400" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none dark:bg-gray-950 dark:text-gray-100 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60"
            : "border-gray-200 focus:border-electric focus:ring-electric/20 dark:border-gray-700"
        }`}
      />

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Status ───────────────────────────────────────────────────────────────── */

type BadgeTone = "neutral" | "accent" | "positive" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  accent: "bg-electric/12 text-electric dark:text-electric-glow",
  positive:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * The empty state.
 *
 * An invitation to act, not an apology. `action` is the point of the component —
 * an empty screen with nothing to press is a dead end, and "no results" for a
 * search someone just typed needs a different sentence from "nothing exists
 * yet", which is why the caller supplies both.
 */
export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-content-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <Icon className="size-5 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * The loading state.
 *
 * `role="status"` so it is announced rather than only spun. A sighted user sees
 * something is happening; without this nobody else does.
 */
export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2.5 px-6 py-14 text-sm text-gray-500 dark:text-gray-400"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/**
 * The error state.
 *
 * Says what failed and offers the retry, because "Something went wrong" with no
 * button is a screen someone has to reload the whole page to escape.
 */
export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-content-center rounded-xl bg-red-100 dark:bg-red-500/15">
        <AlertTriangle
          className="size-5 text-red-600 dark:text-red-400"
          aria-hidden
        />
      </div>
      <p className="mt-4 max-w-sm text-sm text-gray-700 dark:text-gray-300">
        {message}
      </p>
      {onRetry ? (
        <div className="mt-5">
          <AdminButton onClick={onRetry}>Try again</AdminButton>
        </div>
      ) : null}
    </div>
  );
}

/* ── Feedback ─────────────────────────────────────────────────────────────── */

export type ToastTone = "success" | "error";

/**
 * A transient confirmation.
 *
 * `aria-live="polite"` and not `assertive`: this reports something the person
 * just did on purpose, and interrupting a screen reader mid-sentence to confirm
 * a click they made is worse than waiting for a pause.
 *
 * Errors do not auto-dismiss. A success can vanish because the visible state
 * already changed to prove it; a failure is the only record that anything went
 * wrong, and hiding it after four seconds loses the one thing worth keeping.
 */
export function AdminToast({
  message,
  tone,
  onDismiss,
}: {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}) {
  const dismiss = useRef(onDismiss);

  // Assigned in an effect, not during render. Writing to a ref while rendering
  // is what this repo's `react-hooks/refs` rule blocks, and it is right to: a
  // render can be thrown away, so a mutation made during one is a mutation that
  // may or may not have happened.
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  // The timer is keyed on the message rather than on `onDismiss`, so a parent
  // that re-renders with a fresh closure does not keep restarting the countdown
  // and leave a toast up indefinitely. That is the whole reason for the ref.
  useEffect(() => {
    if (tone === "error") return;
    const timer = setTimeout(() => dismiss.current(), 4000);
    return () => clearTimeout(timer);
  }, [tone, message]);

  return (
    <div
      // Sits above the mobile drawer's backdrop, and offset for the safe area so
      // it clears the home indicator on a phone.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ${
          tone === "success"
            ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
            : "bg-red-600 text-white"
        }`}
      >
        {tone === "success" ? (
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <p className="leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 ml-1 grid size-5 shrink-0 place-content-center rounded opacity-70 transition-opacity hover:opacity-100 motion-reduce:transition-none"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Toast state, so a panel does not re-implement the timing every time. */
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);

  return {
    toast,
    dismiss: () => setToast(null),
    success: (message: string) => setToast({ message, tone: "success" }),
    failure: (message: string) => setToast({ message, tone: "error" }),
  };
}
