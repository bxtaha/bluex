"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Headphones } from "lucide-react";
import type { SupportVoicePublic } from "@/lib/support-voice-schema";
import { isVisibleOnPath } from "@/lib/support-voice-visibility";

/**
 * The launcher, and the second of the three gates that decide whether any of
 * this loads.
 *
 * 1. The master toggle is resolved on the **server**, in `app/(site)/layout.tsx`.
 *    Switched off, this component is never rendered and nothing reaches the
 *    browser — not markup, not the agent id, not a byte of the SDK.
 * 2. The page rule is resolved **here**, because a layout cannot know the
 *    pathname. On a page the rules exclude, this returns null.
 * 3. The SDK is resolved **on click**, through the dynamic import below.
 *
 * Gate 2 costs about two kilobytes on a page where the button never appears —
 * this file and the matcher. That is the price of the rules being editable
 * from the admin panel at runtime rather than baked in at build time. The
 * alternative is middleware, which would route every response on a
 * prerender-heavy site through a new hop to place one button. The 300KB is
 * behind gate 3 either way, which is the number that actually matters.
 */

/**
 * `ssr: false` is not a hydration convenience — it is the point.
 *
 * This chunk holds `@elevenlabs/react`, and through it `livekit-client`: about
 * 300KB gzipped, which no connection setting removes because the SDK's entry
 * point imports it unconditionally. Behind this boundary it is fetched when
 * somebody clicks and never otherwise.
 *
 * `loading` matters for the same reason. On a throttled phone that chunk takes
 * a visible moment, so the panel opens immediately into a real "Starting…"
 * rather than the button appearing to do nothing until the download lands.
 */
const SupportPanel = dynamic(() => import("./support-panel"), {
  ssr: false,
  loading: () => (
    <div className="bx-support-panel bx-support-panel--loading" aria-live="polite">
      <p className="bx-support-panel__name">BlueX Support</p>
      <p className="bx-support-panel__status">Starting…</p>
    </div>
  ),
});

export function SupportVoiceMount({ settings }: { settings: SupportVoicePublic }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  if (!isVisibleOnPath(pathname ?? "/", settings.visibilityMode, settings.visibilityPaths)) {
    return null;
  }

  return (
    <div
      className="bx-support-root"
      data-placement={settings.placement}
      data-mobile={settings.mobileEnabled ? "on" : "off"}
    >
      {open ? <SupportPanel settings={settings} onClose={close} /> : null}

      {/* A real button. Focusable, announced, and operable from the keyboard
          without any of that being re-implemented on a div. */}
      <button
        type="button"
        className="bx-support-launcher"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-label={open ? "Close customer support" : settings.buttonLabel}
      >
        <Headphones className="bx-support-launcher__icon" aria-hidden />
        {/* Hidden on small screens by CSS rather than unmounted, so the
            accessible name is the same on every viewport. */}
        <span className="bx-support-launcher__label">{settings.buttonLabel}</span>
      </button>
    </div>
  );
}
