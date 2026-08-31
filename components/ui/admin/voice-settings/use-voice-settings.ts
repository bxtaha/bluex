"use client";

import { useCallback, useEffect, useState } from "react";
import type { VoiceSettingsPatch, VoiceSettingsView } from "@/lib/voice-settings";

/**
 * Loading and saving the voice credentials, in one place.
 *
 * Three components now read this endpoint — the inbound modal, the outbound
 * modal, and the credentials card on the Settings page — and each saves a
 * different subset of the same document. Without a shared hook that is three
 * copies of the same fetch, the same error handling, and the same chance for
 * one of them to drift into calling a different URL.
 *
 * **Each caller fetches independently, on mount, and that is deliberate.** They
 * are never on screen together: the two modals mount only while open (see
 * `AdminModal`, which renders null when closed) and the credentials card lives
 * on a page the modals are not on. Sharing one cached copy between them would
 * mean a modal opening onto values read before the last save.
 *
 * `save` sends **only the fields the caller passes**. The PATCH route reads
 * only the keys present in the body and leaves the rest alone, so the inbound
 * modal cannot overwrite an outbound field it never displayed. That behaviour
 * was built for the secret-handling case; this is its second use.
 */
export function useVoiceSettings(): {
  settings: VoiceSettingsView | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  save: (patch: VoiceSettingsPatch) => Promise<{ ok: boolean; message?: string }>;
  saving: boolean;
} {
  const [settings, setSettings] = useState<VoiceSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // `loading` starts true so the first fetch needs no setState before its first
  // await — this repo's react-hooks lint rejects a setState reached
  // synchronously from an effect body. Only `reload`, which is a click, turns
  // it back on.
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/voice-settings");
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load the voice agent settings.");
          return;
        }
        setSettings(data.settings);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const save = useCallback(
    async (patch: VoiceSettingsPatch): Promise<{ ok: boolean; message?: string }> => {
      setSaving(true);
      try {
        const response = await fetch("/api/admin/voice-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          return { ok: false, message: data.message ?? "Could not save those settings." };
        }

        // The response carries the whole document back, so the caller's view of
        // the fields it did *not* send stays current too.
        setSettings(data.settings);
        return { ok: true };
      } catch {
        return { ok: false, message: "Could not reach the server." };
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { settings, loading, error, reload, save, saving };
}
