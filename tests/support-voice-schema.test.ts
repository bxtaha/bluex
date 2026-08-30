import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SUPPORT_VOICE,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  toPublicSupportVoice,
  validateSupportVoice,
} from "../lib/support-voice-schema.ts";

/**
 * What the server accepts into the support-voice settings.
 *
 * The admin form checks the same things, and the admin form is markup. This is
 * the copy that runs on a request arriving by any means.
 */

test("an absent field is left alone rather than reset to its default", () => {
  // The distinction the whole patch shape exists for: a form that submits only
  // the toggle must not blank the agent id.
  const result = validateSupportVoice({ enabled: true });
  assert.ok(result.ok);
  assert.deepEqual(Object.keys(result.value), ["enabled"]);
});

test("accepts a well-formed agent id and trims it", () => {
  const result = validateSupportVoice({ agentId: "  agent_01jw8xyz  " });
  assert.ok(result.ok);
  assert.equal(result.value.agentId, "agent_01jw8xyz");
});

test("accepts a speech-engine id, which the signed-url endpoint also takes", () => {
  const result = validateSupportVoice({ agentId: "seng_abc123" });
  assert.ok(result.ok);
});

test("rejects an agent id in the wrong shape rather than failing at dispatch", () => {
  // Pasting the API key into the agent field is the mistake this catches. The
  // alternative is a 401 from the provider hours later with nothing pointing
  // at the cause.
  const result = validateSupportVoice({ agentId: "sk_live_not_an_agent" });
  assert.equal(result.ok, false);
});

test("an empty agent id is allowed — it is how the override is cleared", () => {
  const result = validateSupportVoice({ agentId: "" });
  assert.ok(result.ok);
  assert.equal(result.value.agentId, "");
});

test("rejects an unknown placement instead of storing it", () => {
  assert.equal(validateSupportVoice({ placement: "top-left" as never }).ok, false);
});

test("rejects an unknown visibility mode", () => {
  assert.equal(validateSupportVoice({ visibilityMode: "sometimes" as never }).ok, false);
});

test("clamps the session cap rather than refusing the save", () => {
  // A cap is a safety net. Somebody typing 0 or 9999 meant "small" or "large",
  // and clamping keeps their intent while keeping the value usable.
  const low = validateSupportVoice({ maxSessionMinutes: 0 });
  assert.ok(low.ok);
  assert.equal(low.value.maxSessionMinutes, MIN_SESSION_MINUTES);

  const high = validateSupportVoice({ maxSessionMinutes: 9999 });
  assert.ok(high.ok);
  assert.equal(high.value.maxSessionMinutes, MAX_SESSION_MINUTES);
});

test("rejects a session cap that is not a number at all", () => {
  assert.equal(validateSupportVoice({ maxSessionMinutes: Number.NaN }).ok, false);
});

test("a blank button label falls back to the default rather than rendering an empty button", () => {
  const result = validateSupportVoice({ buttonLabel: "   " });
  assert.ok(result.ok);
  assert.equal(result.value.buttonLabel, DEFAULT_SUPPORT_VOICE.buttonLabel);
});

test("caps the greeting instead of storing whatever was pasted", () => {
  const result = validateSupportVoice({ greeting: "x".repeat(5000) });
  assert.equal(result.ok, false);
});

test("normalises the path list on the way in", () => {
  const result = validateSupportVoice({ visibilityPaths: ["pricing", "/blog/*", "/pricing"] });
  assert.ok(result.ok);
  assert.deepEqual(result.value.visibilityPaths, ["/pricing", "/blog/*"]);
});

test("the public projection carries nothing worth stealing", () => {
  const publicView = toPublicSupportVoice({
    ...DEFAULT_SUPPORT_VOICE,
    enabled: true,
    agentId: "agent_secret",
    greeting: "Internal-only greeting",
  });

  // The two that must never reach a browser: the agent id, because the client
  // asks the server for a session instead, and the greeting, which is applied
  // from the session route.
  assert.equal("agentId" in publicView, false);
  assert.equal("greeting" in publicView, false);
  assert.equal("enabled" in publicView, false);
  assert.equal(JSON.stringify(publicView).includes("agent_secret"), false);
});
