import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConversation, phoneKey } from "../lib/call-payload.ts";

/** The webhook shape: everything under `data`. */
const WEBHOOK = {
  type: "post_call_transcription",
  data: {
    conversation_id: "conv_abc",
    agent_id: "agent_1",
    metadata: {
      call_duration_secs: 42,
      start_time_unix_secs: 1_700_000_000,
      phone_call: { direction: "inbound", external_number: "+1 240 820 3149" },
    },
    transcript: [
      { role: "agent", message: "Thanks for calling BlueX.", time_in_call_secs: 1 },
      { role: "user", message: "I need a website.", time_in_call_secs: 4 },
      { role: "agent", message: null, time_in_call_secs: 5 },
    ],
    analysis: { transcript_summary: "Wants a website.", call_successful: "success" },
  },
};

test("parses the webhook envelope", () => {
  const parsed = parseConversation(WEBHOOK);
  assert.ok(parsed);
  assert.equal(parsed.conversationId, "conv_abc");
  assert.equal(parsed.direction, "inbound");
  assert.equal(parsed.counterpartyNumber, "+1 240 820 3149");
  assert.equal(parsed.durationSeconds, 42);
  assert.equal(parsed.summary, "Wants a website.");
  assert.equal(parsed.callSuccessful, "success");
  assert.equal(parsed.startedAt.getTime(), 1_700_000_000_000);
});

test("drops turns with no message", () => {
  const parsed = parseConversation(WEBHOOK);
  assert.equal(parsed!.transcript.length, 2);
  assert.deepEqual(parsed!.transcript[1], {
    role: "user",
    message: "I need a website.",
    at: 4,
  });
});

test("parses the same fields when they arrive unwrapped from the list API", () => {
  const parsed = parseConversation(WEBHOOK.data);
  assert.equal(parsed!.conversationId, "conv_abc");
  assert.equal(parsed!.summary, "Wants a website.");
});

test("reports an unknown direction as null rather than guessing", () => {
  const parsed = parseConversation({
    data: { conversation_id: "conv_x", metadata: {}, transcript: [] },
  });
  assert.equal(parsed!.direction, null);
});

test("returns null without a conversation id", () => {
  assert.equal(parseConversation({ data: { transcript: [] } }), null);
  assert.equal(parseConversation(null), null);
  assert.equal(parseConversation("nonsense"), null);
});

test("survives missing analysis and metadata entirely", () => {
  const parsed = parseConversation({ data: { conversation_id: "conv_y" } });
  assert.equal(parsed!.summary, "");
  assert.equal(parsed!.durationSeconds, 0);
  assert.deepEqual(parsed!.transcript, []);
  assert.equal(parsed!.callSuccessful, "unknown");
});

test("phoneKey keeps only digits", () => {
  assert.equal(phoneKey("+1 240 820 3149"), "12408203149");
  assert.equal(phoneKey("(240) 820-3149"), "2408203149");
  assert.equal(phoneKey(""), "");
});

test("phoneKey agrees on the same international number however it is spaced", () => {
  // The form and the provider's webhook should never split one caller into
  // two leads just because one wrote spaces and the other didn't.
  assert.equal(phoneKey("+44 7123 456789"), phoneKey("+447123456789"));
});

test("phoneKey strips a leading trunk zero but does not guess a country", () => {
  // "07123456789" (what a UK visitor types) and "+447123456789" (what the
  // provider reports for the same call) still differ — this function cannot
  // know the "0" stands for "+44" without information the site never
  // collects. The honest move is to strip only the zero, not to fabricate a
  // country code. See lib/lead.ts's validateLead for where this is actually
  // resolved: it now requires the "+" up front.
  assert.equal(phoneKey("07123456789"), "7123456789");
  assert.notEqual(phoneKey("07123456789"), phoneKey("+447123456789"));
});
