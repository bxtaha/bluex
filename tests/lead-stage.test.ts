import { test } from "node:test";
import assert from "node:assert/strict";
import { leadFilterFor, nextStage } from "../lib/lead-store.ts";
import { validateLead } from "../lib/lead.ts";

test("a new lead becomes contacted once a call completes", () => {
  assert.equal(nextStage("new"), "contacted");
});

test("a stage set by hand is never overwritten by a call", () => {
  // An agent conversation is evidence of contact, not of qualification, and
  // certainly not of a deal being lost. Anything past `new` stays put.
  assert.equal(nextStage("contacted"), "contacted");
  assert.equal(nextStage("qualified"), "qualified");
  assert.equal(nextStage("won"), "won");
  assert.equal(nextStage("lost"), "lost");
});

test("attention filter keeps excluding won/lost when a stage is also asked for", () => {
  // needsAttentionFilter already puts a `$nin` on `stage`. Composing rather
  // than overwriting is the whole point of this test — a bare assignment
  // would replace that exclusion with an equality match and nobody calling
  // it with just `{ filter: "attention" }` would ever notice.
  const filter = leadFilterFor({ filter: "attention", stage: "qualified" }) as {
    $and: Record<string, unknown>[];
  };

  assert.ok(Array.isArray(filter.$and), "expected the two constraints to be $and'ed together");
  const [base, stageClause] = filter.$and;
  assert.deepEqual(base.stage, { $nin: ["won", "lost"] });
  assert.deepEqual(stageClause, { stage: "qualified" });
});

test("validateLead rejects a phone number with no country code", () => {
  // A digit count alone can't tell "07123456789" (a UK number missing its
  // +44) from a number that's simply short — and without the leading "+",
  // `phoneKey` (lib/call-payload.ts) has no way to key this the same as the
  // E.164 number the phone provider reports for the same person's inbound
  // call. Requiring "+" here is what keeps the two paths from ever meeting.
  const errors = validateLead({ name: "Jo", business: "Jo's", phone: "07123456789" });
  assert.ok(errors.phone, "expected an error on a phone number with no +");
});

test("validateLead accepts a phone number with a country code", () => {
  const errors = validateLead({ name: "Jo", business: "Jo's", phone: "+447123456789" });
  assert.equal(errors.phone, undefined);
});
