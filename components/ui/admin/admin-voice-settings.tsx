"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Phone, RadioTower, Webhook } from "lucide-react";
import type { CallTransport, VoiceSettingsView } from "@/lib/voice-settings";
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

const TRANSPORTS: { value: CallTransport; label: string }[] = [
  { value: "twilio", label: "Twilio" },
  { value: "sip", label: "ElevenLabs SIP trunk" },
];

type SourceKind = "database" | "environment" | "unset" | "default";

/**
 * Where a value on screen actually came from, in words rather than a badge —
 * the field beside it can be pre-filled from an environment variable nobody
 * has saved through this form yet, and the admin needs to know that before
 * assuming an unclicked Save button already took care of it.
 */
function SourceNote({ source }: { source: SourceKind }) {
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
 * The voice agent's credentials, editable here instead of only in
 * `.env.local`. Backed by `lib/voice-settings.ts`, which every dispatch and
 * every webhook now reads through — see that file for why an environment
 * variable still works as a fallback rather than being replaced outright.
 *
 * Everything lives in one `<form>` even though it reads as two cards: the
 * connection fields and the two secrets are one save action, just presented
 * with the secrets set apart because they behave differently on screen — see
 * `SecretField` for why.
 *
 * The two secrets never round-trip to this component in the clear. The GET
 * response carries only whether one is set and its last four characters, so
 * their inputs start empty and stay that way unless the admin types a
 * replacement — submitting the form never overwrites a saved secret with
 * nothing just because the field looks blank.
 */
export function AdminVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [callTransport, setCallTransport] = useState<CallTransport>("twilio");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState<"apiKey" | "webhookSecret" | null>(null);
  const toast = useToast();

  const applyView = useCallback((view: VoiceSettingsView) => {
    setSettings(view);
    setAgentId(view.agentId.value);
    setPhoneNumberId(view.phoneNumberId.value);
    setCallTransport(view.callTransport.value);
  }, []);

  // `loading` starts `true`, so the initial fetch below needs no `setState`
  // of its own before its first `await` — only `reload` (a click, never
  // called synchronously from the effect) turns it back on for a retry. Same
  // shape as the Leads and Calls panels' own reload, and for the same reason:
  // this repo's react-hooks lint rejects a `setState` reached synchronously
  // from an effect body, which a plain `load()` called from `useEffect` is.
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
          setLoadError(data.message ?? "Could not load the voice agent settings.");
          return;
        }
        applyView(data.settings);
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
  }, [reloadKey, applyView]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const body: Record<string, unknown> = { agentId, phoneNumberId, callTransport };
    // Only sent when the admin actually typed something — see the component
    // doc comment for why an empty field must never reach the server as "".
    if (apiKeyInput.trim()) body.apiKey = apiKeyInput.trim();
    if (webhookSecretInput.trim()) body.webhookSecret = webhookSecretInput.trim();

    try {
      const response = await fetch("/api/admin/voice-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        toast.failure(data.message ?? "Could not save the voice agent settings.");
        return;
      }
      applyView(data.settings);
      setApiKeyInput("");
      setWebhookSecretInput("");
      toast.success("Voice agent settings saved.");
    } catch {
      toast.failure("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride(field: "apiKey" | "webhookSecret") {
    setClearing(field);
    try {
      const response = await fetch("/api/admin/voice-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        toast.failure(data.message ?? "Could not remove that override.");
        return;
      }
      applyView(data.settings);
      toast.success(
        field === "apiKey" ? "API key override removed." : "Webhook secret override removed.",
      );
    } catch {
      toast.failure("Could not reach the server.");
    } finally {
      setClearing(null);
    }
  }

  if (loading) {
    return (
      <AdminCard>
        <AdminLoading label="Loading voice agent settings…" />
      </AdminCard>
    );
  }

  if (loadError || !settings) {
    return (
      <AdminCard>
        <AdminErrorState
          message={loadError ?? "Could not load the voice agent settings."}
          onRetry={reload}
        />
      </AdminCard>
    );
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <AdminCard>
        <AdminSectionHeader
          title="Voice agent"
          description="Where inbound and outbound calls come from. Changes apply immediately, to both directions."
          action={
            <AdminBadge tone={settings.configured ? "positive" : "warning"}>
              {settings.configured ? "Configured" : "Not configured"}
            </AdminBadge>
          }
        />

        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <AdminField
                label="Agent ID"
                value={agentId}
                onChange={setAgentId}
                placeholder="agent_xxxxxxxxxxxxxxxx"
                disabled={saving}
              />
              <SourceNote source={settings.agentId.source} />
            </div>
            <div>
              <AdminField
                label="Phone number ID"
                value={phoneNumberId}
                onChange={setPhoneNumberId}
                placeholder="phnum_xxxxxxxxxxxxxxxx"
                hint="From Agents → Phone numbers. Not the raw Twilio number."
                disabled={saving}
              />
              <SourceNote source={settings.phoneNumberId.source} />
            </div>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
              <RadioTower className="size-3.5 text-gray-400" aria-hidden />
              Telephony
            </span>
            <div
              className="mt-1.5 flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label="Telephony"
            >
              {TRANSPORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={callTransport === option.value}
                  disabled={saving}
                  onClick={() => setCallTransport(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                    callTransport === option.value
                      ? "bg-electric text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* Never "unset": the code default (twilio) always resolves to something. */}
            <SourceNote source={settings.callTransport.source} />
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminSectionHeader
          title="Credentials"
          description="Neither of these is ever sent back to the browser once saved — only whether one is set."
        />

        <div className="mt-5 space-y-5">
          <SecretField
            icon={KeyRound}
            label="API key"
            placeholder={
              settings.apiKey.set
                ? `Leave blank to keep the current key, ending in ${settings.apiKey.last4 || "····"}`
                : "sk_…"
            }
            value={apiKeyInput}
            onChange={setApiKeyInput}
            info={settings.apiKey}
            disabled={saving}
            clearing={clearing === "apiKey"}
            onClear={
              settings.apiKey.source === "database" ? () => clearOverride("apiKey") : undefined
            }
          />

          <SecretField
            icon={Webhook}
            label="Webhook secret"
            placeholder={
              settings.webhookSecret.set
                ? `Leave blank to keep the current secret, ending in ${settings.webhookSecret.last4 || "····"}`
                : "whsec_…"
            }
            value={webhookSecretInput}
            onChange={setWebhookSecretInput}
            info={settings.webhookSecret}
            disabled={saving}
            clearing={clearing === "webhookSecret"}
            onClear={
              settings.webhookSecret.source === "database"
                ? () => clearOverride("webhookSecret")
                : undefined
            }
            hint="Set the same value as the post-call webhook's signing secret in the ElevenLabs dashboard."
          />
        </div>
      </AdminCard>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Phone className="size-3.5" aria-hidden />
          Applies to both Inbound Calls and Outbound Calls.
        </p>
        <AdminButton type="submit" variant="primary" pending={saving}>
          Save
        </AdminButton>
      </div>

      {toast.toast && (
        <AdminToast message={toast.toast.message} tone={toast.toast.tone} onDismiss={toast.dismiss} />
      )}
    </form>
  );
}

function SecretField({
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
