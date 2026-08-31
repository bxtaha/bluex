"use client";

import { AdminBadge, AdminButton } from "../primitives";

/**
 * The two pieces the split settings forms have in common.
 *
 * Moved here verbatim from `admin-voice-settings.tsx` when that file became
 * three. Copying them into each would have been three chances for the "From
 * environment" wording to drift, and that wording is the whole point of the
 * component.
 */

export type SourceKind = "database" | "environment" | "unset" | "default";

/**
 * Where a value on screen actually came from, in words rather than a badge.
 *
 * The field beside it can be pre-filled from an environment variable nobody has
 * saved through this form yet, and the admin needs to know that before assuming
 * an unclicked Save button already took care of it.
 */
export function SourceNote({ source }: { source: SourceKind }) {
  if (source === "database") return null;

  const label =
    source === "environment"
      ? "From the environment variable — save to store it here instead."
      : source === "default"
        ? "Using the default."
        : "Not set anywhere.";

  return <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>;
}

/**
 * A secret that is never shown back.
 *
 * The input starts empty and stays empty unless somebody types a replacement,
 * because the GET response carries only whether a secret is set and its last
 * four characters. That is what stops a submitted form overwriting a working
 * key with nothing merely because the field looked blank.
 */
export function SecretField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  info,
  disabled,
  clearing,
  onClear,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  info: { set: boolean; source: "database" | "environment" | "unset"; last4: string };
  disabled: boolean;
  clearing: boolean;
  onClear?: () => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
          <Icon className="size-3.5 text-gray-400" aria-hidden />
          {label}
        </span>
        {info.set && (
          <AdminBadge tone={info.source === "database" ? "accent" : "neutral"}>
            {info.source === "database" ? "Saved here" : "From environment"}
          </AdminBadge>
        )}
      </div>

      <div className="mt-1.5 flex gap-2">
        <input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-electric focus:ring-2 focus:ring-electric/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
        {onClear && (
          <AdminButton
            type="button"
            onClick={onClear}
            pending={clearing}
            disabled={disabled}
            title="Remove override"
          >
            Remove
          </AdminButton>
        )}
      </div>

      {hint && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {!info.set && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Not set anywhere.</p>
      )}
    </div>
  );
}
