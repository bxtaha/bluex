"use client";

import { useState } from "react";
import { RadioTower } from "lucide-react";
import type { CallTransport, VoiceSettingsView } from "@/lib/voice-settings";
import {
  AdminButton,
  AdminErrorState,
  AdminField,
  AdminLoading,
} from "../primitives";
import { SourceNote } from "./shared";
import { useVoiceSettings } from "./use-voice-settings";

/**
 * The agent and number this application dials with.
 *
 * **Live configuration, unlike the inbound fields.** `placeCall` sends these
 * three to the provider, so saving one changes what the next dispatched call
 * does. The inbound form looks almost identical and only writes things down;
 * keeping them in separate modals is what stops that difference being invisible.
 *
 * Loader and form are split for the reason given in `inbound.tsx`: the form
 * takes its starting values as props so it mounts populated, rather than
 * mounting empty and being corrected by an effect.
 */

const TRANSPORTS: { value: CallTransport; label: string }[] = [
  { value: "twilio", label: "Twilio" },
  { value: "sip", label: "ElevenLabs SIP trunk" },
];

export function VoiceOutboundSettings({ onDone }: { onDone: () => void }) {
  const { settings, loading, error, reload, save, saving } = useVoiceSettings();

  if (loading) return <AdminLoading label="Loading outbound settings…" />;

  if (error || !settings) {
    return <AdminErrorState message={error ?? "Could not load the settings."} onRetry={reload} />;
  }

  return (
    <OutboundForm settings={settings} save={save} saving={saving} onDone={onDone} />
  );
}

function OutboundForm({
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
  const [agentId, setAgentId] = useState(settings.outbound.agentId.value);
  const [phoneNumberId, setPhoneNumberId] = useState(settings.outbound.phoneNumberId.value);
  const [transport, setTransport] = useState<CallTransport>(
    settings.outbound.callTransport.value,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const result = await save({
      outboundAgentId: agentId,
      outboundPhoneNumberId: phoneNumberId,
      outboundCallTransport: transport,
    });

    if (!result.ok) {
      setMessage(result.message ?? "Could not save.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <div>
        <AdminField
          label="Agent ID"
          value={agentId}
          onChange={setAgentId}
          placeholder="agent_xxxxxxxxxxxxxxxx"
          disabled={saving}
        />
        <SourceNote source={settings.outbound.agentId.source} />
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
        <SourceNote source={settings.outbound.phoneNumberId.source} />
      </div>

      <div>
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
          <RadioTower className="size-3.5 text-gray-400" aria-hidden />
          Telephony
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Telephony">
          {TRANSPORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={transport === option.value}
              disabled={saving}
              onClick={() => setTransport(option.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                transport === option.value
                  ? "bg-electric text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {/* A number imported from Twilio and one provisioned through the
            provider's own SIP trunk are dialled through different endpoints,
            and the wrong choice returns a 404 that reads like a missing agent. */}
        <SourceNote source={settings.outbound.callTransport.source} />
      </div>

      {message ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {message}
        </p>
      ) : null}

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
