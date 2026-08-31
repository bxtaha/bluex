"use client";

import { useState } from "react";
import { KeyRound, Webhook } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminLoading,
  AdminSectionHeader,
  AdminToast,
  useToast,
} from "../primitives";
import { SecretField } from "./shared";
import { useVoiceSettings } from "./use-voice-settings";

/**
 * The API key and webhook secret, on the Settings page.
 *
 * **These stay here rather than being copied into the three channel modals**,
 * and that is the provider's model rather than a layout preference: one key per
 * workspace dispatches for every agent and lists every conversation, and there
 * is exactly one webhook URL receiving every direction and every channel,
 * signed with exactly one secret. `lib/voice-settings.ts` argues at length that
 * splitting them by direction would invent a distinction that does not exist;
 * splitting them by panel is the same mistake in different clothes.
 *
 * Neither secret is ever sent back to the browser. The GET response carries
 * only whether one is set and its last four characters — the same amount
 * Stripe or GitHub shows for a token you have already saved — so the inputs
 * start empty and a submitted form cannot overwrite a working key with nothing
 * merely because the field looked blank. Clearing an override is therefore its
 * own explicit button rather than "save an empty field".
 *
 * Unlike the two channel modals this is a card, not a modal body: it lives on a
 * page rather than behind a gear, because it is not any one channel's setting.
 */
export function VoiceCredentialsSettings() {
  const { settings, loading, error, reload, save, saving } = useVoiceSettings();
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [clearing, setClearing] = useState<"apiKey" | "webhookSecret" | null>(null);
  const toast = useToast();

  if (loading) {
    return (
      <AdminCard>
        <AdminLoading label="Loading credentials…" />
      </AdminCard>
    );
  }

  if (error || !settings) {
    return (
      <AdminCard>
        <AdminErrorState message={error ?? "Could not load the credentials."} onRetry={reload} />
      </AdminCard>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const patch: Parameters<typeof save>[0] = {};
    // Sent only when something was actually typed. An empty field means "leave
    // the stored value alone", which is a different thing from "clear it" —
    // that is what the Remove button is for.
    if (apiKey.trim()) patch.apiKey = apiKey.trim();
    if (webhookSecret.trim()) patch.webhookSecret = webhookSecret.trim();

    if (Object.keys(patch).length === 0) {
      toast.success("Nothing to save — type a new secret to replace one.");
      return;
    }

    const result = await save(patch);
    if (!result.ok) {
      toast.failure(result.message ?? "Could not save the credentials.");
      return;
    }

    setApiKey("");
    setWebhookSecret("");
    toast.success("Credentials saved.");
  }

  async function clearOverride(field: "apiKey" | "webhookSecret") {
    setClearing(field);
    // `null`, not `""`. The route reads them differently on purpose: null means
    // "remove the override and fall back to the environment variable", while an
    // empty string is rejected so a blank input can never wipe a working key.
    const result = await save({ [field]: null });
    setClearing(null);

    if (!result.ok) {
      toast.failure(result.message ?? "Could not remove that override.");
      return;
    }
    toast.success(
      field === "apiKey" ? "API key override removed." : "Webhook secret override removed.",
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <AdminCard>
        <AdminSectionHeader
          title="Voice credentials"
          description="Shared by every channel — one API key per workspace, one webhook URL. Used by outbound calls, inbound calls and the browser support widget alike."
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
            value={apiKey}
            onChange={setApiKey}
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
            value={webhookSecret}
            onChange={setWebhookSecret}
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

        <div className="mt-5 flex justify-end">
          <AdminButton type="submit" variant="primary" pending={saving}>
            Save credentials
          </AdminButton>
        </div>
      </AdminCard>

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
