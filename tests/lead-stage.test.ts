import { test } from "node:test";
import assert from "node:assert/strict";
import { leadFilterFor, nextStage } from "../lib/lead-store.ts";

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
