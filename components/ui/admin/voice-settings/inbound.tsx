"use client";

import { useState } from "react";
import type { VoiceSettingsView } from "@/lib/voice-settings";
import {
  AdminButton,
  AdminErrorState,
  AdminField,
  AdminLoading,
} from "../primitives";
import { SourceNote } from "./shared";
import { useVoiceSettings } from "./use-voice-settings";

/**
 * Which agent and number answer an inbound call.
 *
 * **Reference only, and the copy says so rather than implying otherwise.**
 * Nothing this application runs can attach an agent to a phone number for
 * inbound — that happens in the ElevenLabs dashboard, under Agents → Phone
 * numbers. These two fields exist so the answer to "which agent is on that
 * number" has a visible home instead of living in somebody's memory, and
 * saving them changes what is written down here, not what the provider does.
 *
 * That is the opposite of the outbound fields next door, which `placeCall`
 * sends to the provider, so saving one changes the next dispatched call. The
 * two look identical and behave completely differently, which is most of why
 * they no longer share a form and one Save button.
 *
 * Split into a loader and a form on purpose. The form takes its starting values
 * as props and holds them in `useState`, so it mounts already populated —
 * rather than mounting empty and being filled by an effect, which is both a
 * frame of wrong values on screen and the `set-state-in-effect` rule this repo
 * enforces. The same shape as `AdminModal`: render nothing until the state is
 * right, instead of correcting it afterwards.
 */
export function VoiceInboundSettings({ onDone }: { onDone: () => void }) {
  const { settings, loading, error, reload, save, saving } = useVoiceSettings();

  if (loading) return <AdminLoading label="Loading inbound settings…" />;

  if (error || !settings) {
    return <AdminErrorState message={error ?? "Could not load the settings."} onRetry={reload} />;
  }

  return (
    <InboundForm settings={settings} save={save} saving={saving} onDone={onDone} />
  );
}

function InboundForm({
  settings,
  save,
  saving,
  onDone,
}: {
  settings: VoiceSettingsView;
  save: ReturnType<typeof useVoiceSettings>["save"];
  saving: boolean;
  onDone: () => void;
}) {
  const [agentId, setAgentId] = useState(settings.inbound.agentId.value);
  const [phoneNumberId, setPhoneNumberId] = useState(settings.inbound.phoneNumberId.value);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    // Only the two fields this form owns. The route applies partial patches, so
    // the outbound agent and the shared credentials are untouched by this save
    // — which is the whole reason three forms against one document is safe.
    const result = await save({
      inboundAgentId: agentId,
      inboundPhoneNumberId: phoneNumberId,
    });

    if (!result.ok) {
      setMessage(result.message ?? "Could not save.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-900 dark:text-gray-400">
        Recorded here for reference. Attaching an agent to a number for inbound
        calls happens in the ElevenLabs dashboard under{" "}
        <span className="font-medium">Agents → Phone numbers</span> — saving this
        form writes down what should be attached there, it does not make the
        attachment.
      </p>

      <div>
        <AdminField
          label="Agent ID"
          value={agentId}
          onChange={setAgentId}
          placeholder="agent_xxxxxxxxxxxxxxxx"
          disabled={saving}
        />
        <SourceNote source={settings.inbound.agentId.source} />
      </div>

      <div>
        <AdminField
          label="Phone number ID"
          value={phoneNumberId}
          onChange={setPhoneNumberId}
          placeholder="phnum_xxxxxxxxxxxxxxxx"
          disabled={saving}
        />
        <SourceNote source={settings.inbound.phoneNumberId.source} />
      </div>

      {message ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {message}
        </p>
      ) : null}

      {/* Inside the form rather than in the modal's footer slot: a submit
          button outside its form does nothing, and reconnecting one through the
          `form` attribute is a coupling that breaks silently the moment either
          id changes. */}
      <div className="flex justify-end gap-2 pt-1">
        <AdminButton type="button" onClick={onDone} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" variant="primary" pending={saving}>
          Save
        </AdminButton>
      </div>
    </form>
  );
}
