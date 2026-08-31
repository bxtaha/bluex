"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * A modal that holds a form.
 *
 * Separate from `AdminConfirmDialog` rather than a variant of it. That one is
 * shaped around a single irreversible decision — it has a confirm word, a
 * destructive tone, and a body that is prose. This one holds fields, scrolls,
 * and is dismissed without consequence. Merging them would mean a component
 * where half the props are inert whichever way it is used.
 *
 * **Layer 75.** Above the admin toast at 70, because a modal must cover a
 * toast rather than be covered by one, and below `AdminConfirmDialog` at 80,
 * because a confirmation opened from *inside* one of these has to cover the
 * modal that opened it. Giving both 80 would leave that pair ordered by DOM
 * position, which is how a confirmation ends up rendering behind the thing it
 * is confirming.
 *
 * The focus handling is lifted from `AdminConfirmDialog` deliberately — same
 * problems, same answers, and two dialogs in one admin area that trap focus
 * differently is its own bug:
 *
 * - Focus moves in on open and returns to the trigger on close. Without the
 *   return, dismissing drops focus to the top of the document and a keyboard
 *   user tabs back through the whole sidebar.
 * - Tab is cycled inside the panel; letting the browser handle it walks focus
 *   into the page behind the backdrop.
 * - Escape closes, unless a save is in flight — hiding a request that is still
 *   running tells the person it stopped.
 */
export function AdminModal({
  open,
  ...props
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Blocks Escape and the backdrop while a save is running. */
  pending?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Mounted only while open, so the form inside starts clean every time. The
  // alternative — staying mounted and clearing state in an effect when `open`
  // flips — trips this repo's `set-state-in-effect` rule, and the rule is
  // right: a reset that lands one render *after* the modal appears is a window
  // in which last time's half-typed value is still on screen.
  if (!open) return null;
  return <ModalPanel {...props} />;
}

function ModalPanel({
  onClose,
  title,
  description,
  pending = false,
  children,
  footer,
}: {
  onClose: () => void;
  title: string;
  description?: string;
  pending?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Generated rather than hardcoded. `AdminConfirmDialog` can afford a fixed id
  // because only one is ever open; these are opened from three different
  // panels, and two elements sharing an id silently points `aria-labelledby` at
  // whichever the browser found first.
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const returnFocusTo = document.activeElement as HTMLElement | null;

    // The panel itself, not the first field. Landing inside a text input means
    // a screen reader starts mid-form instead of reading the title that
    // explains what the form is.
    panel.current?.focus();

    return () => returnFocusTo?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
  }, [pending, onClose]);

  return (
    <div className="bx-admin-modal">
      {/* Not a button: a full-screen one is announced as a single control
          covering the whole page. Escape and the close button are the
          accessible routes out; this is the pointer convenience on top. */}
      <div
        className="bx-admin-modal__backdrop"
        onClick={pending ? undefined : onClose}
        aria-hidden
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="bx-admin-modal__panel"
      >
        <div className="bx-admin-modal__head">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[0.9375rem] font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-[0.8125rem] leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="bx-admin-modal__close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* The only scrolling region. Both axes stated: `overflow-y` alone
            computes `overflow-x` to `auto` and grows a phantom horizontal
            scrollbar, which cost real time in the nav panel once. */}
        <div className="bx-admin-modal__body">{children}</div>

        {footer ? <div className="bx-admin-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
