"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff, X } from "lucide-react";
import { useReducedMotion } from "@/lib/use-media-query";
import type { SupportVoicePublic } from "@/lib/support-voice-schema";
import { SupportWaveform } from "./support-waveform";

/**
 * The conversation window.
 *
 * **This module is the reason the widget is loaded on click.** Importing
 * `@elevenlabs/react` pulls in `@elevenlabs/client`, whose entry point
 * statically re-exports the WebRTC connection, which imports `livekit-client`
 * — about 300KB gzipped that no `connectionType` setting removes, because the
 * import is not conditional. This file is behind a `next/dynamic` boundary so
 * none of it reaches a visitor who never clicks. Do not import it from
 * anything that renders eagerly.
 *
 * The session is a WebSocket, not WebRTC: we hand the SDK a signed URL, which
 * only the WebSocket transport accepts. That also keeps `connect-src` down to
 * one host — see the CSP note in `next.config.ts`.
 */

/** Served from this origin so the CSP needs no `blob:` in script-src. See `scripts/sync-worklets.ts`. */
const WORKLET_PATHS = {
  rawAudioProcessor: "/worklets/raw-audio-processor.js",
  audioConcatProcessor: "/worklets/audio-concat-processor.js",
};
const LIBSAMPLERATE_PATH = "/worklets/libsamplerate.worklet.js";

/**
 * How long a hidden tab keeps its session.
 *
 * Ending on `visibilitychange` outright would cut a call off the moment
 * somebody alt-tabs to read something out — which mid-conversation is most of
 * the reason they would. Thirty seconds is long enough to check another tab
 * and short enough that a forgotten session cannot idle for an hour on the
 * meter.
 */
const HIDDEN_GRACE_MS = 30_000;

/**
 * What the visitor is looking at.
 *
 * Held separately from the SDK's `status` because several of these have no
 * equivalent there — the SDK knows nothing about a microphone we have not
 * asked for yet, or about a session route that refused. Every one of them
 * renders something specific, and none of them is a spinner that can sit
 * forever.
 */
type Phase =
  | "starting"
  | "permission"
  | "denied"
  | "unavailable"
  | "live"
  | "ended"
  | "failed";

type SessionInfo = { signedUrl: string; greeting: string; maxSessionMinutes: number };

export default function SupportPanel(props: {
  settings: SupportVoicePublic;
  onClose: () => void;
}) {
  return (
    <ConversationProvider>
      <PanelBody {...props} />
    </ConversationProvider>
  );
}

function PanelBody({
  settings,
  onClose,
}: {
  settings: SupportVoicePublic;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("starting");
  const [detail, setDetail] = useState("");
  const [language, setLanguage] = useState("");

  /*
   * The language indicator.
   *
   * There is no language field on any event this SDK delivers —
   * `conversation_initiation_metadata` carries a conversation id and two audio
   * formats and nothing else, and the only `language_code` fields in
   * `@elevenlabs/types` belong to Scribe, which is a different product. The
   * one runtime signal is the agent's `language_detection` system tool being
   * called, which arrives as an ordinary tool request.
   *
   * So this reads that, and shows nothing at all until it fires. An indicator
   * showing the language we *asked* for would look like detection without
   * being it. If the tool is not enabled on the agent — it is off by default,
   * and only the ElevenLabs dashboard can turn it on — no language ever
   * appears, which is the honest state rather than a broken one.
   */
  const onAgentToolRequest = useCallback((request: unknown) => {
    if (typeof request !== "object" || request === null) return;
    const record = request as Record<string, unknown>;
    if (record.tool_name !== "language_detection") return;

    // Read defensively: this is a third-party shape that is not documented as
    // a language API, so it may well change under us. Losing the indicator is
    // an acceptable cost; throwing inside a callback the SDK invokes is not.
    const params = record.params_as_json ?? record.parameters;
    try {
      const parsed = typeof params === "string" ? JSON.parse(params) : params;
      const code = (parsed as Record<string, unknown> | null)?.language;
      if (typeof code === "string" && code) setLanguage(code);
    } catch {
      // A shape we do not recognise costs the indicator, not the call.
    }
  }, []);

  // Callbacks passed here are registered with the provider and stay current
  // across re-renders, so this is the supported way to hear about tool calls
  // rather than reaching into the client.
  const conversation = useConversation({ onAgentToolRequest });

  const { status, mode, isMuted, setMuted, startSession, endSession } = conversation;

  // The loop and the teardown both need to end a session without being torn
  // down themselves when the SDK hands back a new function identity.
  const endRef = useRef(endSession);
  useEffect(() => {
    endRef.current = endSession;
  }, [endSession]);

  /* ── Starting ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Permission first, and explicitly, rather than letting the SDK ask.
      // Asking here is what makes "denied" a state we can name: the SDK
      // reports a failed start, which is the same shape as six other failures
      // and would leave the visitor reading "something went wrong" when the
      // truthful answer is "your browser is blocking the microphone".
      let stream: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          if (!cancelled) setPhase("unavailable");
          return;
        }
        setPhase("permission");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (!cancelled) setPhase("denied");
        return;
      }

      // Released immediately. Permission survives, so the SDK's own request a
      // moment later resolves without a second prompt — and meanwhile the
      // microphone indicator in the browser chrome does not sit lit during a
      // network round trip that might yet fail.
      for (const track of stream.getTracks()) track.stop();
      if (cancelled) return;

      let session: SessionInfo;
      try {
        const response = await fetch("/api/voice/session", { method: "POST" });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          if (!cancelled) {
            setPhase("failed");
            setDetail(typeof data.message === "string" ? data.message : "");
          }
          return;
        }
        session = data;
      } catch {
        if (!cancelled) {
          setPhase("failed");
          setDetail("We couldn't reach the server.");
        }
        return;
      }

      if (cancelled) return;

      try {
        startSession({
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          workletPaths: WORKLET_PATHS,
          libsampleratePath: LIBSAMPLERATE_PATH,
          // Only applied if first-message overrides are allowlisted on the
          // agent in the ElevenLabs dashboard; the provider drops it silently
          // otherwise. Sent blank-free so an unset greeting does not override
          // the agent's own opening line with an empty string.
          ...(session.greeting
            ? { overrides: { agent: { firstMessage: session.greeting } } }
            : {}),
        });
        if (!cancelled) setPhase("live");
      } catch {
        if (!cancelled) {
          setPhase("failed");
          setDetail("The conversation could not be started.");
        }
      }
    })();

    return () => {
      cancelled = true;
      // Covers the case where this unmounts mid-start: the session may have
      // begun between the last check and here, and an un-ended session keeps
      // billing.
      try {
        endRef.current();
      } catch {
        // Already ended, or never started. Either way there is nothing to do.
      }
    };
    // Deliberately once per mount. The panel is remounted for each new
    // conversation, so re-running this on a dependency change would start a
    // second session on top of the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Ending ────────────────────────────────────────────────────────────── */

  // A session that outlives the page keeps costing money, and the visitor who
  // closed the tab is not there to notice. `pagehide` rather than
  // `beforeunload`: it fires on mobile Safari's back-forward cache path, where
  // `beforeunload` does not.
  useEffect(() => {
    const stop = () => {
      try {
        endRef.current();
      } catch {
        // Nothing to end.
      }
    };

    let hiddenTimer: number | undefined;

    const onVisibility = () => {
      window.clearTimeout(hiddenTimer);
      if (document.visibilityState === "hidden") {
        hiddenTimer = window.setTimeout(stop, HIDDEN_GRACE_MS);
      }
    };

    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(hiddenTimer);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // The configured safety cap. Runs from mount rather than from `connected`,
  // so a session that never quite connects cannot sit open indefinitely either.
  useEffect(() => {
    const minutes = Math.max(1, settings.maxSessionMinutes);
    const timer = window.setTimeout(
      () => {
        try {
          endRef.current();
        } catch {
          // Nothing to end.
        }
        setPhase("ended");
      },
      minutes * 60 * 1000,
    );

    return () => window.clearTimeout(timer);
  }, [settings.maxSessionMinutes]);

  /* ── What is on screen ─────────────────────────────────────────────────── */

  /*
   * `phase` is only what *we* know — that we have asked for a microphone, that
   * the session route refused, that the visitor hung up. Everything the SDK
   * knows stays in `status`, and the two are combined here at render.
   *
   * This was an effect that copied `status` into `phase`, and the lint rule
   * against setState in an effect was right to reject it: two pieces of state
   * describing one thing means every render is a chance for them to disagree,
   * and a disconnect arriving one render before the copy would show
   * "Listening" for a conversation that had already dropped. Deriving it
   * cannot go stale, because there is nothing to keep in sync.
   */
  const view: Phase =
    phase !== "live"
      ? phase
      : status === "error"
        ? "failed"
        : status === "disconnected"
          ? "ended"
          : "live";

  const speaker: "agent" | "visitor" | "idle" =
    view !== "live" || status !== "connected"
      ? "idle"
      : mode === "speaking"
        ? "agent"
        : isMuted
          ? "idle"
          : "visitor";

  const line = statusLine({ phase: view, status, isMuted, mode, detail });
  const finished = view === "denied" || view === "failed" || view === "unavailable";

  function hangUp() {
    try {
      endRef.current();
    } catch {
      // Nothing to end.
    }
    setPhase("ended");
  }

  return (
    <div
      className="bx-support-panel"
      role="dialog"
      aria-label="Customer support voice conversation"
      data-theme={settings.theme}
    >
      <div className="bx-support-panel__head">
        <div className="bx-support-panel__who">
          <p className="bx-support-panel__name">BlueX Support</p>
          {/* aria-live so a screen reader hears the state change rather than
              only seeing it. Polite: it is a status, never an interruption. */}
          <p className="bx-support-panel__status" aria-live="polite">
            {line}
          </p>
        </div>

        <div className="bx-support-panel__head-actions">
          {language ? (
            <span className="bx-support-panel__lang" title="Detected language">
              {language.toUpperCase()}
            </span>
          ) : null}
          <button
            type="button"
            className="bx-support-icon-btn"
            onClick={() => {
              hangUp();
              onClose();
            }}
            aria-label="Close and end the conversation"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <SupportWaveform
        active={view === "live" && status === "connected"}
        speaker={speaker}
        reducedMotion={reducedMotion}
        getInputData={conversation.getInputByteFrequencyData}
        getOutputData={conversation.getOutputByteFrequencyData}
      />

      {finished || view === "ended" ? (
        <div className="bx-support-panel__fallback">
          <p>{fallbackCopy(view)}</p>
          {/* Never a dead end. Whatever went wrong with the microphone, the
              form still works and is one tap away. */}
          <Link className="bx-support-panel__link" href="/#contact">
            Use the contact form instead
          </Link>
        </div>
      ) : (
        <div className="bx-support-panel__controls">
          <button
            type="button"
            className="bx-support-btn"
            onClick={() => setMuted(!isMuted)}
            disabled={status !== "connected"}
            aria-pressed={isMuted}
          >
            {isMuted ? (
              <MicOff className="size-4" aria-hidden />
            ) : (
              <Mic className="size-4" aria-hidden />
            )}
            {isMuted ? "Unmute" : "Mute"}
          </button>

          <button
            type="button"
            className="bx-support-btn bx-support-btn--end"
            onClick={hangUp}
          >
            <PhoneOff className="size-4" aria-hidden />
            End
          </button>
        </div>
      )}
    </div>
  );
}

function statusLine({
  phase,
  status,
  isMuted,
  mode,
  detail,
}: {
  phase: Phase;
  status: string;
  isMuted: boolean;
  mode: string;
  detail: string;
}): string {
  if (phase === "permission") return "Waiting for microphone access…";
  if (phase === "denied") return "No microphone access";
  if (phase === "unavailable") return "This browser can't record audio";
  if (phase === "failed") return detail || "Something went wrong";
  if (phase === "ended") return "Conversation ended";
  if (phase === "starting") return "Starting…";

  if (status === "connecting") return "Connecting…";
  if (status === "disconnected") return "Reconnecting…";
  if (status === "error") return detail || "Something went wrong";
  if (isMuted) return "Muted — the agent can't hear you";
  return mode === "speaking" ? "Speaking" : "Listening";
}

function fallbackCopy(phase: Phase): string {
  if (phase === "denied") {
    // Names the fix rather than the failure. "Permission denied" tells someone
    // what happened; this tells them what to do about it.
    return "Your browser is blocking the microphone for this site. Allow it in the address bar and try again, or send us a message instead.";
  }
  if (phase === "unavailable") {
    return "This browser can't record audio, so the voice conversation isn't available here.";
  }
  if (phase === "failed") {
    return "We couldn't start the conversation. Please try again in a moment.";
  }
  return "Thanks for talking to us. Anything else, and we're one message away.";
}
