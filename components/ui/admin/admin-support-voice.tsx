"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Headphones, Languages, MessageSquareQuote } from "lucide-react";
import type {
  StoredSupportVoice,
  SupportVoicePlacement,
  SupportVoiceTheme,
  SupportVoiceVisibilityMode,
} from "@/lib/support-voice-schema";
import { formatPathList, parsePathList } from "@/lib/support-voice-visibility";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminField,
  AdminLoading,
  AdminSectionHeader,
  AdminToast,
  useToast,
} from "./primitives";

/**
 * The browser support agent, configured.
 *
 * A third channel beside the two the card above this one configures: no phone
 * call, no dialling — a visitor clicks a button on the public site and talks
 * through their microphone.
 *
 * Two things this form deliberately says out loud rather than implying, both
 * of the same kind as the "Inbound calls" note next door — a setting saved
 * here that only takes effect if something is also done in the ElevenLabs
 * dashboard:
 *
 * - **The greeting override is ignored unless it is allowlisted on the agent.**
 *   The provider drops `overrides.agent.firstMessage` silently otherwise, so a
 *   greeting typed here would appear saved and never be spoken.
 * - **The language indicator needs the `language_detection` system tool.**
 *   There is no language field on any event the SDK delivers; the indicator
 *   reads that tool's call. Without it enabled the panel simply shows no
 *   language, which is the honest state rather than a broken one.
 */

const PLACEMENTS: { value: SupportVoicePlacement; label: string }[] = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
];

const MODES: { value: SupportVoiceVisibilityMode; label: string }[] = [
  { value: "all", label: "All pages" },
  { value: "only", label: "Only these" },
  { value: "except", label: "All except these" },
];

const THEMES: { value: SupportVoiceTheme; label: string }[] = [
  { value: "site", label: "Follow site" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/* ── Local field shapes ───────────────────────────────────────────────────────
   Not added to `primitives.tsx`: a toggle, a radio row and a textarea are used
   by this card and nothing else, and a shared primitive with one caller is a
   guess about the second one. They move up if a second panel needs them. */

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        ) : null}
      </div>

      {/* A real checkbox rather than a styled div, so it is focusable,
          announced, and toggled by the keyboard without any of that being
          re-implemented. The visual switch is the sibling span. */}
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="block h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-electric peer-focus-visible:ring-2 peer-focus-visible:ring-electric/40 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 motion-reduce:transition-none dark:bg-gray-700 dark:peer-focus-visible:ring-offset-gray-950"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
        />
      </label>
    </div>
  );
}

function RadioRow<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </span>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
              value === option.value
                ? "bg-electric text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-electric focus:ring-2 focus:ring-electric/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── The card ─────────────────────────────────────────────────────────────── */

export function AdminSupportVoice() {
  const [settings, setSettings] = useState<StoredSupportVoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [enabled, setEnabled] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [placement, setPlacement] = useState<SupportVoicePlacement>("bottom-right");
  const [visibilityMode, setVisibilityMode] = useState<SupportVoiceVisibilityMode>("all");
  const [pathsText, setPathsText] = useState("");
  const [greeting, setGreeting] = useState("");
  const [theme, setTheme] = useState<SupportVoiceTheme>("site");
  const [mobileEnabled, setMobileEnabled] = useState(true);
  const [maxSessionMinutes, setMaxSessionMinutes] = useState("10");
  const [logToInbox, setLogToInbox] = useState(true);

  const apply = useCallback((next: StoredSupportVoice) => {
    setSettings(next);
    setEnabled(next.enabled);
    setAgentId(next.agentId);
    setButtonLabel(next.buttonLabel);
    setPlacement(next.placement);
    setVisibilityMode(next.visibilityMode);
    setPathsText(formatPathList(next.visibilityPaths));
    setGreeting(next.greeting);
    setTheme(next.theme);
    setMobileEnabled(next.mobileEnabled);
    setMaxSessionMinutes(String(next.maxSessionMinutes));
    setLogToInbox(next.logToInbox);
  }, []);

  // `loading` starts true so the first fetch needs no setState before its
  // first await — this repo's react-hooks lint rejects a setState reached
  // synchronously from an effect body. Same shape as the panel above.
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/support-voice");
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setLoadError(data.message ?? "Could not load the support agent settings.");
          return;
        }
        apply(data.settings);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, apply]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    // Parsed here as well as on the server. This copy is so the field shows
    // the tidied list back immediately; the server's copy is the one that
    // decides, because this one is markup.
    const body = {
      enabled,
      agentId,
      buttonLabel,
      placement,
      visibilityMode,
      visibilityPaths: parsePathList(pathsText),
      greeting,
      theme,
      mobileEnabled,
      // An empty or non-numeric box would reach the server as NaN and be
      // rejected there; sending the stored value instead keeps a blur-then-save
      // from failing over a field nobody touched.
      maxSessionMinutes: Number(maxSessionMinutes) || (settings?.maxSessionMinutes ?? 10),
      logToInbox,
    };

    try {
      const response = await fetch("/api/admin/support-voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        toast.failure(data.message ?? "Could not save the support agent settings.");
        return;
      }
      apply(data.settings);
      toast.success("Support agent settings saved.");
    } catch {
      toast.failure("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminCard>
        <AdminLoading label="Loading support agent settings…" />
      </AdminCard>
    );
  }

  if (loadError || !settings) {
    return (
      <AdminCard>
        <AdminErrorState
          message={loadError ?? "Could not load the support agent settings."}
          onRetry={reload}
        />
      </AdminCard>
    );
  }

  // Live means both switched on and pointed at an agent. Either alone renders
  // no working button, and saying "On" for a toggle with no agent behind it is
  // how someone concludes the feature is broken rather than unfinished.
  const live = settings.enabled && settings.agentId.length > 0;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <AdminCard>
        <AdminSectionHeader
          title="Customer Support voice"
          description="A button on the public site that lets a visitor talk to your agent through their browser. No phone call is placed — this is a separate channel from the two above."
          action={
            <AdminBadge tone={live ? "positive" : settings.enabled ? "warning" : "neutral"}>
              <Headphones className="size-3 shrink-0" aria-hidden />
              {live ? "Live" : settings.enabled ? "No agent set" : "Off"}
            </AdminBadge>
          }
        />

        <div className="mt-5 space-y-5">
          <Toggle
            label="Enabled"
            hint="Off means nothing is sent to the browser at all — no button, and none of the voice code is downloaded."
            checked={enabled}
            onChange={setEnabled}
            disabled={saving}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              label="Agent ID"
              value={agentId}
              onChange={setAgentId}
              placeholder="agent_xxxxxxxxxxxxxxxx"
              hint="The conversational agent that answers. Usually not the same one that makes outbound calls."
              disabled={saving}
            />
            <AdminField
              label="Button label"
              value={buttonLabel}
              onChange={setButtonLabel}
              placeholder="Customer Support"
              hint="Hidden on small screens, where the button is icon-only."
              disabled={saving}
            />
          </div>

          <RadioRow
            label="Button placement"
            options={PLACEMENTS}
            value={placement}
            onChange={setPlacement}
            disabled={saving}
          />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminSectionHeader
          title="Where it appears"
          description="One path per line. A path on its own matches that page exactly; ending it with /* matches the section beneath it as well."
        />

        <div className="mt-5 space-y-5">
          <RadioRow
            label="Pages"
            options={MODES}
            value={visibilityMode}
            onChange={setVisibilityMode}
            disabled={saving}
          />

          {visibilityMode === "all" ? null : (
            <TextArea
              label={visibilityMode === "only" ? "Show only on" : "Hide on"}
              value={pathsText}
              onChange={setPathsText}
              rows={4}
              placeholder={"/pricing\n/blog/*"}
              hint={
                visibilityMode === "only"
                  ? "With nothing listed the button appears nowhere."
                  : "With nothing listed the button appears everywhere."
              }
              disabled={saving}
            />
          )}

          <Toggle
            label="Show on mobile"
            hint="Turn off to keep the button to larger screens."
            checked={mobileEnabled}
            onChange={setMobileEnabled}
            disabled={saving}
          />

          <RadioRow
            label="Theme"
            options={THEMES}
            value={theme}
            onChange={setTheme}
            disabled={saving}
          />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminSectionHeader
          title="The conversation"
          description="What the agent opens with, how long a session may run, and where it is recorded."
        />

        <div className="mt-5 space-y-5">
          <TextArea
            label="Greeting override"
            value={greeting}
            onChange={setGreeting}
            rows={2}
            placeholder="Leave blank to use the agent's own first message."
            hint="Only takes effect if the first-message override is allowlisted on this agent in the ElevenLabs dashboard. The provider ignores it silently otherwise."
            disabled={saving}
          />

          <AdminField
            label="Maximum session length (minutes)"
            value={maxSessionMinutes}
            onChange={setMaxSessionMinutes}
            hint="A safety cap. The conversation ends when it is reached, and also whenever the visitor closes the tab."
            disabled={saving}
          />

          <Toggle
            label="Record conversations"
            hint="Stores each conversation under Calls, tagged as a web conversation. Phone calls are recorded regardless of this setting."
            checked={logToInbox}
            onChange={setLogToInbox}
            disabled={saving}
          />

          <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <Languages className="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden />
            <span>
              The panel shows the spoken language only once the agent&rsquo;s{" "}
              <span className="font-medium">language detection</span> tool reports a
              switch. Enable that tool on the agent in the ElevenLabs dashboard if you
              want it — nothing here can turn it on, and until it is on the panel simply
              shows no language.
            </span>
          </p>

          <p className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-gray-400" aria-hidden />
            <span>
              Conversations arrive through the same post-call webhook as phone calls, so
              the webhook URL and signing secret in the card above cover this channel
              too. Nothing extra to configure.
            </span>
          </p>
        </div>
      </AdminCard>

      <div className="flex items-center gap-3">
        <AdminButton type="submit" variant="primary" pending={saving}>
          Save support settings
        </AdminButton>
      </div>

      {toast.toast && (
        <AdminToast
          message={toast.toast.message}
          tone={toast.toast.tone}
          onDismiss={toast.dismiss}
        />
      )}
    </form>
  );
}
