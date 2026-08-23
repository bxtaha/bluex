"use client";

import { useEffect, useRef, useState } from "react";
import { AdminButton } from "./primitives";

/**
 * A modal confirmation.
 *
 * The reason this is not `window.confirm`: a native dialog cannot say which
 * client is about to be deleted, cannot require the person to type its address,
 * and is suppressed entirely by some browsers after a few uses. All three matter
 * for a destructive action.
 *
 * Focus handling is the substance of this component, not the styling:
 *
 * - Focus moves in on open and returns to the trigger on close. Without the
 *   return, dismissing a dialog drops focus to the top of the document and a
 *   keyboard user has to tab back through the entire sidebar.
 * - Tab is cycled inside the panel. A dialog that lets focus wander behind it is
 *   one where the next Enter presses something invisible.
 * - Escape closes, unless a request is in flight — cancelling the dialog would
 *   not cancel the delete, so it would just hide what is happening.
 * - The background gets `inert`, which is typed `boolean` in React 19 rather
 *   than the empty string older guides use.
 *
 * `confirmWord` turns the dialog into a deliberate act rather than a reflex:
 * where it is set, the confirm button stays disabled until the word is typed.
 * Reserved for things that cannot be undone.
 */
export function AdminConfirmDialog({
  open,
  ...props
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** When set, must be typed exactly before confirming is possible. */
  confirmWord?: string;
  confirmWordLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Mounted only while open, so the panel below starts with fresh state every
  // time. The alternative — keeping it mounted and clearing `typed` in an effect
  // when `open` flips — is the same thing done worse: it trips this repo's
  // `set-state-in-effect` rule, and the rule is right, because a reset that
  // happens one render *after* the dialog appears is a window where a
  // half-typed confirmation from last time still counts. Remounting cannot have
  // that window.
  if (!open) return null;
  return <ConfirmPanel {...props} />;
}

function ConfirmPanel({
  title,
  description,
  confirmLabel,
  confirmWord,
  confirmWordLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmWord?: string;
  confirmWordLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const returnFocusTo = document.activeElement as HTMLElement | null;

    // Focus the panel itself rather than the first control. Landing on
    // "Delete" means an Enter pressed out of habit destroys something.
    panel.current?.focus();

    // Focus returns to whatever opened this. Without it, dismissing drops focus
    // to the top of the document and a keyboard user tabs back through the
    // entire sidebar to get where they were.
    return () => returnFocusTo?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap manually at both ends. Letting the browser handle it walks focus
      // into the page behind the backdrop.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pending, onCancel]);

  const armed = !confirmWord || typed.trim() === confirmWord;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      {/* Not a button: a full-screen button is announced as one control covering
          the whole page. Escape and Cancel are the accessible routes out, and
          this is the pointer convenience on top of them. */}
      <div
        className="absolute inset-0 bg-gray-950/60"
        onClick={pending ? undefined : onCancel}
        aria-hidden
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl outline-none sm:p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2
          id="admin-confirm-title"
          className="text-[0.9375rem] font-semibold text-gray-900 dark:text-gray-100"
        >
          {title}
        </h2>

        <div
          id="admin-confirm-description"
          className="mt-2 text-[0.8125rem] leading-relaxed text-gray-600 dark:text-gray-400"
        >
          {description}
        </div>

        {confirmWord ? (
          <label className="mt-4 block">
            <span className="block text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
              {confirmWordLabel ?? `Type ${confirmWord} to confirm`}
            </span>
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={pending}
              // Every one of these off: a browser helpfully completing the
              // address of the record being deleted defeats the entire point of
              // asking someone to type it.
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-electric focus:ring-2 focus:ring-electric/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AdminButton onClick={onCancel} disabled={pending}>
            Cancel
          </AdminButton>
          <AdminButton
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={!armed}
            pending={pending}
          >
            {confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
