import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStage } from "../lib/lead-store.ts";

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
