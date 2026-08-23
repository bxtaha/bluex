"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Form pieces shared by the portal's sign-in and setup forms.
 *
 * Extracted because the two forms need identical inputs and an identical error
 * treatment, and two copies of a focus ring drift within a week. Kept in this
 * file rather than `components/ui/admin/` because these are brand-side — the
 * staff dashboard's equivalents use a different palette and belong to a
 * different application.
 */

/**
 * A labelled text input.
 *
 * `id` is generated rather than passed, so a caller cannot render two of these
 * with the same id and silently break the label association — clicking the label
 * would focus the wrong field, and a screen reader would read the wrong name.
 *
 * `aria-describedby` is wired only when there is an error to describe. Pointing
 * it at an element that is empty means assistive technology announces the field
 * as having a description and then reads nothing.
 */
export function ClientField({
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  icon: Icon,
  required = true,
  disabled = false,
  hint,
}: {
  label: string;
  type?: "text" | "email" | "password";
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  // A password field that can be revealed is not a security hole — it is how
  // someone on a phone keyboard types a 16-character password correctly the
  // first time. The alternative is a "confirm password" field, which catches
  // typos by making everyone type it twice.
  const inputType = isPassword && revealed ? "text" : type;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.8125rem] font-medium text-ink"
      >
        {label}
      </label>

      <div className="relative mt-2">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
        ) : null}

        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-xl border bg-black/30 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-muted/60 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            Icon ? "pl-10" : "pl-3.5"
          } ${isPassword ? "pr-11" : "pr-3.5"} ${
            error
              ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
              : "border-white/12 focus:border-electric focus:ring-electric/25"
          }`}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            // Not in the tab order between the field and the submit button:
            // someone tabbing from password to "Sign in" should reach the
            // button, not a toggle they did not ask for.
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-content-center rounded-lg text-ink-muted transition-colors hover:text-ink"
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The form-level error.
 *
 * `role="alert"` with `aria-live` so it is announced when it appears rather than
 * only being visible. A sign-in failure that is purely a colour change is a
 * sign-in failure a screen-reader user does not know happened.
 *
 * Rendered as `sr-only` rather than removed when empty, so the live region is
 * already in the accessibility tree when its content changes — a region inserted
 * at the same moment as its text is frequently not announced at all.
 */
export function ClientFormError({ message }: { message: string | null }) {
  return (
    <p
      role="alert"
      aria-live="polite"
      className={
        message
          ? "mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-red-300"
          : "sr-only"
      }
    >
      {message}
    </p>
  );
}

export function ClientSubmit({
  pending,
  children,
  pendingLabel,
  icon: Icon,
}: {
  pending: boolean;
  children: string;
  pendingLabel: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric text-sm font-semibold text-white transition-[background-color,opacity] hover:bg-electric-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-hidden
        />
      ) : Icon ? (
        <Icon className="size-4" aria-hidden />
      ) : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
