"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { cn } from "@/lib/utils";

/**
 * A dialog that covers the page.
 *
 * Portalled to `document.body` rather than rendered in place: the card it opens
 * from is `overflow: hidden`, which would clip it. Worth keeping the portal even
 * if that ever changes — any transformed ancestor becomes a containing block
 * that `position: fixed` resolves against instead of the viewport, and that
 * failure is silent.
 *
 * Escape, an outside click, a wrapped focus loop, and focus restored to the
 * opener on close — the same four obligations the nav panel meets, met the same
 * way. Not a native `<dialog>`: the top layer ignores the page's stacking
 * context, and the backdrop here is styled to match the site's glass rather
 * than the UA's.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portals need a DOM target, which does not exist during the server render.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    openerRef.current = document.activeElement;
    lockScroll();

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!panel.contains(event.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    // Deferred a frame, or the very pointerdown that opened this dialog is
    // still being dispatched and would immediately close it again.
    const arm = requestAnimationFrame(() =>
      document.addEventListener("pointerdown", onPointerDown),
    );

    focusable()[0]?.focus();

    return () => {
      cancelAnimationFrame(arm);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      unlockScroll();
      // Focus goes back to whatever opened this, so tabbing does not restart
      // from the top of the document.
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="bx-modal" role="presentation">
      <div className="bx-modal__scrim" />

      <div
        ref={panelRef}
        className={cn("bx-modal__panel", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          className="bx-modal__close"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={1.8} aria-hidden />
        </button>

        <div className="bx-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
