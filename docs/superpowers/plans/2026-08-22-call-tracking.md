# Call Tracking and Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every voice-agent conversation in both directions, make transcripts searchable, and attach each one to a person you can move through a follow-up pipeline.

**Architecture:** A new `calls` collection is the single home for conversations, deduplicated by a unique index on the provider's `conversationId` so the webhook and a reconciliation cron can both write safely. `leads` widens from "someone who asked to be called" into "a person", gaining a unique `phoneKey`, a pipeline stage, a follow-up date and append-only notes; inbound callers find-or-create a lead. One shared intake function records a conversation identically no matter which path delivered it.

**Tech Stack:** Next 16 App Router · React 19 · Tailwind v4 · TypeScript 5 · MongoDB 7 driver · `node:test` with `--experimental-strip-types` (no test dependency added)

**Spec:** `docs/superpowers/specs/2026-08-22-call-tracking-design.md`

## Global Constraints

- **Node 22.22.2.** Tests run on the built-in runner. Do not add jest, vitest, mocha or ava.
- **Tailwind v4, no config file.** Tokens live in `@theme inline` at the top of `app/globals.css`.
- **All component CSS lives in `app/globals.css`.** No styled-jsx, no `.module.css`. Tailwind utilities inline for layout; a named `.bx-*` class for anything with state, pseudo-elements or keyframes.
- **Never write `-webkit-backdrop-filter`.** Chrome 150 rejects it and Lightning CSS collapses an author-written pair keeping only the prefixed one. Write the standard property alone.
- **State both overflow axes.** `overflow: hidden auto`, never `overflow-y: auto` alone.
- **React hooks lint is strict and blocks the build.** No `setState` reached synchronously from an effect body, no ref reads during render, no mutating a counter inside a render-time `.map`. The reload-key pattern in `components/ui/admin-inbox.tsx` is the sanctioned way to trigger a refetch.
- **`inert` is typed `boolean`** in React 19, not `""`.
- **Tailwind never sees a class name built by template.** Write `bg-blue-50` in full; never `bg-${tint}-50`.
- **Stores are framework-free.** Files in `lib/*-store.ts` must not import from `next/*` so scripts and jobs can use them without a bundler. The Next-facing cache layer goes in a separate file (`lib/contact.ts` is the existing example).
- **Cached objects outlive their types.** Any value read back through `unstable_cache` must be spread over a defaults object before use — see `lib/contact.ts`, where omitting this took the home page down.
- **Commit messages are prose explaining why, not bullet lists.** End with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Do not push.** The user says "push" explicitly each time.
- **Do not `pkill -f "next start"`** — it kills the agent's own shell. Kill PIDs one at a time.

**Verification split.** Pure logic is unit tested with `node --test`. Anything touching MongoDB or HTTP is verified with the exact `curl` and script commands given in each task, run against `npm run dev`. Do not write unit tests that connect to the live database — it is the user's real Atlas cluster.

---

### Task 1: Test harness and conversation payload parsing

The parser is pure — no network, no database — which is exactly why it is first and why it carries the test setup.

**Files:**
- Create: `lib/call-payload.ts`
- Create: `tests/call-payload.test.ts`
- Modify: `package.json` (add the `test` script)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type CallDirection = "inbound" | "outbound"`
  - `type TranscriptTurn = { role: "agent" | "user"; message: string; at: number }`
  - `type ParsedCall = { conversationId: string; direction: CallDirection | null; counterpartyNumber: string; agentId: string; callSuccessful: "success" | "failure" | "unknown"; startedAt: Date; durationSeconds: number; transcript: TranscriptTurn[]; summary: string }`
  - `function parseConversation(payload: unknown): ParsedCall | null`
  - `function phoneKey(value: string): string`

- [ ] **Step 1: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "node --test --experimental-strip-types --no-warnings tests/*.test.ts"
```

- [ ] **Step 2: Write the failing tests**

Create `tests/call-payload.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/call-payload.ts'`

- [ ] **Step 4: Write the parser**

Create `lib/call-payload.ts`:

```ts
/**
 * Turns a provider conversation object into something this codebase can store.
 *
 * Pure on purpose — no network, no database. The webhook and the reconciliation
 * sync both hand payloads to this function, and keeping it free of both means
 * its behaviour can be pinned down with a literal object rather than a live
 * call that nobody in this timezone can place.
 *
 * Written defensively throughout. This is a third-party shape we do not
 * control: a missing summary should cost the summary, not the transcript.
 */

export type CallDirection = "inbound" | "outbound";

export type TranscriptTurn = {
  role: "agent" | "user";
  message: string;
  /** Seconds from the start of the call. */
  at: number;
};

export type ParsedCall = {
  conversationId: string;
  /** Null when the payload did not say. The caller decides — see call-intake. */
  direction: CallDirection | null;
  counterpartyNumber: string;
  agentId: string;
  callSuccessful: "success" | "failure" | "unknown";
  startedAt: Date;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string;
};

function pick(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return null;
  return (value as Record<string, unknown>)[key] ?? null;
}

function text(value: unknown, key: string): string {
  const found = pick(value, key);
  return typeof found === "string" ? found : "";
}

function number(value: unknown, key: string): number {
  const found = pick(value, key);
  return typeof found === "number" && Number.isFinite(found) ? found : 0;
}

/** Digits only. The join key between a call and the person on the other end. */
export function phoneKey(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Accepts either shape the provider sends.
 *
 * The webhook wraps the conversation in `data`; fetching one by id returns it
 * unwrapped. Unwrapping here rather than at each call site means the two
 * delivery paths cannot drift into parsing the same conversation differently.
 */
export function parseConversation(payload: unknown): ParsedCall | null {
  const data = pick(payload, "data") ?? payload;

  const conversationId = text(data, "conversation_id");
  if (!conversationId) return null;

  const metadata = pick(data, "metadata");
  const analysis = pick(data, "analysis");
  const phone = pick(metadata, "phone_call");

  const startedUnix = number(metadata, "start_time_unix_secs");

  return {
    conversationId,
    direction: parseDirection(text(phone, "direction")),
    counterpartyNumber: text(phone, "external_number"),
    agentId: text(data, "agent_id"),
    callSuccessful: parseVerdict(text(analysis, "call_successful")),
    // Falls back to now rather than to the epoch: a call filed under 1970 sorts
    // to the bottom of the archive forever and is effectively lost.
    startedAt: startedUnix > 0 ? new Date(startedUnix * 1000) : new Date(),
    durationSeconds: number(metadata, "call_duration_secs"),
    transcript: parseTranscript(pick(data, "transcript")),
    summary: text(analysis, "transcript_summary"),
  };
}

function parseDirection(value: string): CallDirection | null {
  if (value === "inbound" || value === "outbound") return value;
  // Deliberately not a guess. `call-intake` resolves this from whether a lead
  // already claims the conversation, which cannot be wrong.
  return null;
}

function parseVerdict(value: string): ParsedCall["callSuccessful"] {
  return value === "success" || value === "failure" ? value : "unknown";
}

function parseTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): TranscriptTurn => ({
      role: text(entry, "role") === "user" ? "user" : "agent",
      message: text(entry, "message"),
      at: number(entry, "time_in_call_secs"),
    }))
    // An interrupted agent turn arrives with a null message. It is noise in a
    // transcript nobody can act on.
    .filter((turn) => turn.message.trim().length > 0);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — `# pass 7`, `# fail 0`

- [ ] **Step 6: Commit**

```bash
git add package.json lib/call-payload.ts tests/call-payload.test.ts
git commit -m "Parse a conversation without needing one to have happened

The provider sends the same conversation in two shapes: wrapped in \`data\`
from the webhook, bare from the fetch-by-id endpoint. Unwrapping in one
place means the two delivery paths cannot drift into disagreeing about the
same call.

Direction is left null when the payload does not say, rather than guessed.
Somewhere that has to become inbound or outbound, but it should be the layer
that can check whether a lead already claims the conversation, not the one
reading strings out of an object.

Tests run on Node's built-in runner. This repo bought its LCP back by
deleting JavaScript; it is not adding a test framework to assert on a pure
function.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The calls collection

**Files:**
- Create: `lib/call-store.ts`

**Interfaces:**
- Consumes: `CallDirection`, `TranscriptTurn` from `lib/call-payload.ts`
- Produces:
  - `type Call` (full shape in the code below)
  - `type NewCall = Omit<Call, "id" | "createdAt">`
  - `function insertCallIfNew(input: NewCall): Promise<Call | null>`
  - `function listCalls(options?: { direction?: CallDirection; query?: string; leadId?: string; limit?: number }): Promise<Call[]>`
  - `function getCall(id: string): Promise<Call | null>`
  - `function getCallByConversationId(conversationId: string): Promise<Call | null>`
  - `function hasCall(conversationId: string): Promise<boolean>`

- [ ] **Step 1: Write the store**

Create `lib/call-store.ts`:

```ts
import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import type { CallDirection, TranscriptTurn } from "./call-payload.ts";

/**
 * `calls` — every conversation the agent has had, in either direction.
 *
 * The single home for transcripts. A lead is a person; a call is something
 * that happened to them. Keeping the transcript here rather than on the lead
 * is what lets one person hold several conversations without the record
 * having to decide which of them is "the" transcript.
 *
 * Framework-free like the other stores.
 */

export type Call = {
  id: string;
  /** The provider's handle. Unique — the dedupe key for both write paths. */
  conversationId: string;
  direction: CallDirection;

  counterpartyNumber: string;
  /** Digits only. The join key to a lead. */
  counterpartyKey: string;
  agentId: string;

  /** Always set — every call belongs to a lead, inbound included. */
  leadId: string;
  /** Denormalised for the list and for the text index. */
  name: string;

  callSuccessful: "success" | "failure" | "unknown";
  startedAt: Date;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string;

  /** Which path delivered this. Makes a silent webhook failure visible. */
  source: "webhook" | "sync";
  createdAt: Date;
};

export type NewCall = Omit<Call, "id" | "createdAt">;

type CallDoc = Omit<Call, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<CallDoc>> {
  const db = await getDb();
  const calls = db.collection<CallDoc>("calls");
  await ensureIndexes(calls);
  return calls;
}

let indexed: Promise<unknown> | null = null;

/**
 * Indexes, created once per process.
 *
 * The unique one on `conversationId` is the whole reliability design. The
 * webhook and the reconciliation cron both write the same records, and rather
 * than have either check whether the other got there first — a check that is
 * wrong the moment they overlap — the database refuses the second insert.
 * `message-store.ts` earns its IMAP idempotency the same way.
 *
 * `startedAt` and not `createdAt` carries the sort: a call recovered by the
 * cron is inserted long after it happened, and ordering by insertion time
 * would file it under the wrong day.
 */
function ensureIndexes(calls: Collection<CallDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    calls.createIndex({ conversationId: 1 }, { unique: true }),
    calls.createIndex({ startedAt: -1 }),
    calls.createIndex({ direction: 1, startedAt: -1 }),
    calls.createIndex({ leadId: 1, startedAt: -1 }),
    calls.createIndex({ counterpartyKey: 1 }),
    // One text index per collection is a Mongo limit, so this is the only
    // shot: the words someone said, what the agent made of it, and who they
    // are. Weighted so a name match beats a passing mention mid-transcript.
    calls.createIndex(
      { "transcript.message": "text", summary: "text", name: "text" },
      { weights: { name: 10, summary: 4, "transcript.message": 1 }, name: "call_text" },
    ),
  ]).catch((error) => {
    console.error("[calls] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}

function toCall(doc: CallDoc & { _id: ObjectId }): Call {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId ?? "",
    direction: doc.direction === "outbound" ? "outbound" : "inbound",
    counterpartyNumber: doc.counterpartyNumber ?? "",
    counterpartyKey: doc.counterpartyKey ?? "",
    agentId: doc.agentId ?? "",
    leadId: doc.leadId ?? "",
    name: doc.name ?? "",
    callSuccessful: doc.callSuccessful ?? "unknown",
    startedAt: doc.startedAt ?? new Date(),
    durationSeconds: doc.durationSeconds ?? 0,
    transcript: doc.transcript ?? [],
    summary: doc.summary ?? "",
    source: doc.source === "sync" ? "sync" : "webhook",
    createdAt: doc.createdAt ?? new Date(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Stores a call, or reports that it is already stored.
 *
 * Returns null on a duplicate rather than throwing, because for the cron a
 * duplicate is the expected outcome on every run after the first — it is how
 * "we already have this one" is spelled, not an error.
 */
export async function insertCallIfNew(input: NewCall): Promise<Call | null> {
  const calls = await collection();
  const _id = new ObjectId();
  const doc: CallDoc = { ...input, _id, createdAt: new Date() };

  try {
    await calls.insertOne(doc);
    return toCall(doc as CallDoc & { _id: ObjectId });
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

export async function hasCall(conversationId: string): Promise<boolean> {
  const calls = await collection();
  const found = await calls.findOne(
    { conversationId },
    { projection: { _id: 1 } },
  );
  return found !== null;
}

/**
 * The archive, filtered and searched.
 *
 * A digit-only query bypasses the text index and matches the number by prefix
 * instead. Text search tokenises phone numbers badly, and "find that number"
 * is the second most likely search after "find that word".
 */
export async function listCalls(
  options: {
    direction?: CallDirection;
    query?: string;
    leadId?: string;
    limit?: number;
  } = {},
): Promise<Call[]> {
  const calls = await collection();
  const filter: Filter<CallDoc> = {};

  if (options.direction) filter.direction = options.direction;
  if (options.leadId) filter.leadId = options.leadId;

  const query = options.query?.trim() ?? "";
  const digits = query.replace(/\D/g, "");
  const isNumberSearch = query.length > 0 && digits.length === query.replace(/[\s()+-]/g, "").length && digits.length >= 3;

  if (isNumberSearch) {
    filter.counterpartyKey = { $regex: `^${digits}` };
  } else if (query) {
    filter.$text = { $search: query };
  }

  const limit = Math.min(options.limit ?? 100, 200);

  // Ranked by relevance when searching, by recency otherwise. Sorting a text
  // search by date alone throws away the only thing the index computed.
  const cursor = query && !isNumberSearch
    ? calls
        .find(filter, { projection: { score: { $meta: "textScore" } } })
        .sort({ score: { $meta: "textScore" }, startedAt: -1 })
    : calls.find(filter).sort({ startedAt: -1 });

  const docs = await cursor.limit(limit).toArray();
  return docs.map((doc) => toCall(doc as CallDoc & { _id: ObjectId }));
}

export async function getCall(id: string): Promise<Call | null> {
  if (!ObjectId.isValid(id)) return null;
  const calls = await collection();
  const doc = await calls.findOne({ _id: new ObjectId(id) });
  return doc ? toCall(doc as CallDoc & { _id: ObjectId }) : null;
}

export async function getCallByConversationId(
  conversationId: string,
): Promise<Call | null> {
  if (!conversationId) return null;
  const calls = await collection();
  const doc = await calls.findOne({ conversationId });
  return doc ? toCall(doc as CallDoc & { _id: ObjectId }) : null;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Verify the indexes actually build against the real cluster**

Create nothing permanent — run this one-off:

```bash
node --experimental-strip-types --no-warnings --env-file=.env.local -e 'import("./lib/call-store.ts").then(async (m) => { console.log(await m.listCalls({})); process.exit(0); })'
```

Expected: `[]` and no index errors. A text-index error here means the weights object is malformed and must be fixed before continuing.

- [ ] **Step 4: Commit**

```bash
git add lib/call-store.ts
git commit -m "Let the database refuse a call we already have

The webhook and the reconciliation cron write the same records. Rather than
have either ask first whether the other got there — a question whose answer
is stale the moment they overlap — the unique index on the conversation id
refuses the second insert and \`insertCallIfNew\` returns null. For the cron
that is not an error, it is how \"already have this one\" is spelled, which is
every run after the first.

Sorting is on when the call happened, not when we heard about it. A call the
cron recovers is inserted long after the fact, and ordering by insertion time
would file it under the wrong day.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Leads become people

**Files:**
- Modify: `lib/lead-store.ts`
- Create: `scripts/backfill-leads.ts`
- Create: `tests/lead-stage.test.ts`
- Modify: `package.json` (add `seed:backfill` script)

**Interfaces:**
- Consumes: `phoneKey` from `lib/call-payload.ts`
- Produces:
  - `type LeadStage = "new" | "contacted" | "qualified" | "won" | "lost"`
  - `type LeadNote = { body: string; at: Date; author: string }`
  - `Lead` gains `phoneKey: string`, `stage: LeadStage`, `followUpAt: Date | null`, `notes: LeadNote[]`; loses `transcript`, `summary`, `durationSeconds`, `callSuccessful`, `endedAt`
  - `type LeadSource = "form" | "inline" | "inbound"` (widened in `lib/lead.ts`)
  - `function findOrCreateLeadByPhone(input: { name: string; business: string; phone: string; email: string; source: LeadSource; ipHash: string }): Promise<{ lead: Lead; created: boolean }>`
  - `function setLeadStage(id: string, stage: LeadStage): Promise<boolean>`
  - `function setLeadFollowUp(id: string, at: Date | null): Promise<boolean>`
  - `function appendLeadNote(id: string, note: { body: string; author: string }): Promise<boolean>`
  - `function advanceStageOnContact(id: string): Promise<void>`
  - `function needsAttentionCount(): Promise<number>`
  - `function nextStage(current: LeadStage): LeadStage` (pure; the stage rule, called by `advanceStageOnContact` — not a test-only export)
  - `listLeads` gains `filter: "all" | "attention" | "completed"` unchanged, plus `stage?: LeadStage`

- [ ] **Step 1: Widen `LeadSource`**

In `lib/lead.ts`, change the type and its comment:

```ts
/**
 * Where the lead came from. The inline demo widget trades the business name
 * for lower friction — asking for it before someone will try the thing is
 * what stops them trying it. The agent asks on the call instead.
 *
 * `inbound` is not a form at all: it is someone who rang the published number,
 * created by the call rather than by a submission.
 */
export type LeadSource = "form" | "inline" | "inbound";
```

`validateLead` is unchanged — it is only ever called on form submissions, and its `source === "form"` branch already treats anything else as the low-friction path.

- [ ] **Step 2: Write the failing test for stage advancement**

Create `tests/lead-stage.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `nextStage` is not exported from `lib/lead-store.ts`

- [ ] **Step 4: Rework the lead store**

In `lib/lead-store.ts`:

Replace the import line and the `Lead` type block. Delete `TranscriptTurn` from this file entirely — it now lives in `lib/call-payload.ts`.

```ts
import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import { phoneKey } from "./call-payload.ts";
import type { LeadSource } from "./lead.ts";

export type LeadStage = "new" | "contacted" | "qualified" | "won" | "lost";

export type LeadNote = {
  body: string;
  at: Date;
  author: string;
};

export type CallStatus =
  | "pending"
  | "dispatched"
  | "completed"
  | "failed"
  | "not_configured";

export type Lead = {
  id: string;

  name: string;
  business: string;
  phone: string;
  /** Digits only. Unique — one lead per human. */
  phoneKey: string;
  email: string;
  source: LeadSource;

  /**
   * Where this person is commercially. A different axis from `callStatus`,
   * which only ever describes whether our outbound dispatch went out — a lead
   * can be `completed` and `qualified` at the same time and both are true.
   */
  stage: LeadStage;
  /** When to chase. Null when nothing is scheduled. */
  followUpAt: Date | null;
  /** Append-only. Newest last in storage, rendered newest first. */
  notes: LeadNote[];

  callStatus: CallStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  failureReason: string;
  conversationId: string;
  callSid: string;

  ipHash: string;
  createdAt: Date;
};
```

Update `toLead` to map the new fields and drop the removed ones:

```ts
function toLead(doc: LeadDoc & { _id: ObjectId }): Lead {
  return {
    id: doc._id.toHexString(),
    name: doc.name ?? "",
    business: doc.business ?? "",
    phone: doc.phone ?? "",
    phoneKey: doc.phoneKey ?? phoneKey(doc.phone ?? ""),
    email: doc.email ?? "",
    source: doc.source ?? "form",
    stage: doc.stage ?? "new",
    followUpAt: doc.followUpAt ?? null,
    notes: doc.notes ?? [],
    callStatus: doc.callStatus ?? "pending",
    attempts: doc.attempts ?? 0,
    lastAttemptAt: doc.lastAttemptAt ?? null,
    failureReason: doc.failureReason ?? "",
    conversationId: doc.conversationId ?? "",
    callSid: doc.callSid ?? "",
    ipHash: doc.ipHash ?? "",
    createdAt: doc.createdAt ?? new Date(),
  };
}
```

Add `phoneKey` unique and the follow-up index to `ensureIndexes`:

```ts
function ensureIndexes(leads: Collection<LeadDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    leads.createIndex(
      { conversationId: 1 },
      { partialFilterExpression: { conversationId: { $type: "string", $gt: "" } } },
    ),
    // One lead per human. This is what makes both intake paths find-or-create
    // rather than insert: submit the form twice and you are one person with
    // two calls, which is the entire point of putting a pipeline on a lead.
    leads.createIndex({ phoneKey: 1 }, { unique: true }),
    leads.createIndex({ createdAt: -1 }),
    leads.createIndex({ callStatus: 1, createdAt: -1 }),
    leads.createIndex({ stage: 1, followUpAt: 1 }),
  ]).catch((error) => {
    console.error("[leads] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}
```

Replace `createLead` with `findOrCreateLeadByPhone`:

```ts
/**
 * The person on the other end of a phone number, created if we have not met.
 *
 * Races are settled by the unique index rather than by looking first: two
 * concurrent form submissions from one number would both see "no lead" and
 * both insert. The loser catches the duplicate and re-reads, which is correct
 * under concurrency in a way that check-then-insert never is.
 *
 * An existing lead is never overwritten by a later submission — a returning
 * caller who gives less detail the second time must not erase what we already
 * know. Only genuinely empty fields are filled in.
 */
export async function findOrCreateLeadByPhone(input: {
  name: string;
  business: string;
  phone: string;
  email: string;
  source: LeadSource;
  ipHash: string;
}): Promise<{ lead: Lead; created: boolean }> {
  const leads = await collection();
  const key = phoneKey(input.phone);

  const existing = await leads.findOne({ phoneKey: key });
  if (existing) {
    const fill: Partial<LeadDoc> = {};
    if (!existing.name && input.name) fill.name = input.name;
    if (!existing.business && input.business) fill.business = input.business;
    if (!existing.email && input.email) {
      fill.email = input.email.trim().toLowerCase();
    }

    if (Object.keys(fill).length > 0) {
      await leads.updateOne({ _id: existing._id }, { $set: fill });
    }
    const merged = { ...existing, ...fill } as LeadDoc & { _id: ObjectId };
    return { lead: toLead(merged), created: false };
  }

  const _id = new ObjectId();
  const doc: LeadDoc = {
    _id,
    name: input.name,
    business: input.business,
    phone: input.phone,
    phoneKey: key,
    email: input.email.trim().toLowerCase(),
    source: input.source,
    stage: "new",
    followUpAt: null,
    notes: [],
    callStatus: "pending",
    attempts: 0,
    lastAttemptAt: null,
    failureReason: "",
    conversationId: "",
    callSid: "",
    ipHash: input.ipHash,
    createdAt: new Date(),
  };

  try {
    await leads.insertOne(doc);
    return { lead: toLead(doc as LeadDoc & { _id: ObjectId }), created: true };
  } catch (error) {
    if (isDuplicateKey(error)) {
      // Someone else inserted between our read and our write. Theirs is as
      // good as ours.
      const won = await leads.findOne({ phoneKey: key });
      if (won) return { lead: toLead(won as LeadDoc & { _id: ObjectId }), created: false };
    }
    throw error;
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
```

Delete `recordCallOutcome` entirely — outcomes live on the call now.

Add the pipeline mutations and the pure stage rule:

```ts
/**
 * What a completed call does to a stage.
 *
 * Pure and exported so the rule can be pinned down without a database. Only
 * `new` moves: a conversation happening is evidence of contact and nothing
 * more, and it must never drag a lead someone marked `won` backwards.
 */
export function nextStage(current: LeadStage): LeadStage {
  return current === "new" ? "contacted" : current;
}

export async function setLeadStage(id: string, stage: LeadStage): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const leads = await collection();
  const result = await leads.updateOne({ _id: new ObjectId(id) }, { $set: { stage } });
  return result.matchedCount > 0;
}

export async function setLeadFollowUp(id: string, at: Date | null): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const leads = await collection();
  const result = await leads.updateOne(
    { _id: new ObjectId(id) },
    { $set: { followUpAt: at } },
  );
  return result.matchedCount > 0;
}

/**
 * Appends a note. There is no edit and no delete, and that is the feature: a
 * pipeline whose history can be quietly rewritten is worth less than one that
 * cannot.
 */
export async function appendLeadNote(
  id: string,
  note: { body: string; author: string },
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const body = note.body.trim().slice(0, 2000);
  if (!body) return false;

  const leads = await collection();
  const result = await leads.updateOne(
    { _id: new ObjectId(id) },
    { $push: { notes: { body, author: note.author, at: new Date() } } },
  );
  return result.matchedCount > 0;
}

export async function advanceStageOnContact(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const leads = await collection();

  const lead = await leads.findOne(
    { _id: new ObjectId(id) },
    { projection: { stage: 1 } },
  );
  if (!lead) return;

  const current: LeadStage = lead.stage ?? "new";
  const next = nextStage(current);
  if (next === current) return;

  // Compare-and-set on the stage we actually read, so a manual change landing
  // between the read and the write wins instead of being clobbered. The rule
  // itself lives in `nextStage` and is called here rather than restated — a
  // rule spelled out twice is a rule that eventually disagrees with itself,
  // and the test would keep passing while this drifted.
  await leads.updateOne(
    { _id: new ObjectId(id), stage: current },
    { $set: { stage: next } },
  );
}
```

Replace `attentionLeadCount` with `needsAttentionCount`, and add a matching filter:

```ts
const NEEDS_CALL: CallStatus[] = ["pending", "failed", "not_configured"];

/**
 * The one number in the sidebar badge: people who need you today.
 *
 * Never successfully called, or overdue for a chase. Closed leads are excluded
 * — a `won` deal with a stale follow-up date is not work.
 */
function needsAttentionFilter(): Filter<LeadDoc> {
  return {
    stage: { $nin: ["won", "lost"] },
    $or: [
      { callStatus: { $in: NEEDS_CALL } },
      { followUpAt: { $ne: null, $lte: new Date() } },
    ],
  };
}

export async function needsAttentionCount(): Promise<number> {
  const leads = await collection();
  return leads.countDocuments(needsAttentionFilter());
}
```

Update `matchFor` to use it:

```ts
function matchFor(filter: LeadFilter): Filter<LeadDoc> {
  if (filter === "attention") return needsAttentionFilter();
  if (filter === "completed") return { callStatus: "completed" };
  return {};
}
```

And widen `listLeads` with an optional stage:

```ts
export async function listLeads(
  options: { filter?: LeadFilter; stage?: LeadStage; limit?: number } = {},
): Promise<Lead[]> {
  const leads = await collection();
  const filter = matchFor(options.filter ?? "all");
  if (options.stage) filter.stage = options.stage;

  const docs = await leads
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(options.limit ?? 100, 200))
    .toArray();
  return docs.map((doc) => toLead(doc as LeadDoc & { _id: ObjectId }));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 9 tests total across both files

- [ ] **Step 6: Write the backfill script**

Create `scripts/backfill-leads.ts`:

```ts
/**
 * Backfills the fields added when leads became people.
 *
 * Idempotent — it only touches documents actually missing a field, so running
 * it twice changes nothing the second time. Safe to run against production
 * before deploying the code that needs these fields, which is the order that
 * avoids a window where the app reads documents it cannot understand.
 */
import { getDb } from "../lib/mongodb.ts";
import { phoneKey } from "../lib/call-payload.ts";

const db = await getDb();
const leads = db.collection("leads");

let keyed = 0;
for await (const doc of leads.find({ phoneKey: { $exists: false } })) {
  await leads.updateOne(
    { _id: doc._id },
    { $set: { phoneKey: phoneKey(String(doc.phone ?? "")) } },
  );
  keyed += 1;
}

const defaults = await leads.updateMany(
  { stage: { $exists: false } },
  { $set: { stage: "new", followUpAt: null, notes: [] } },
);

// The transcript fields moved to `calls`. Leaving them would be dead weight on
// every read of every lead forever.
const stripped = await leads.updateMany(
  {},
  {
    $unset: {
      transcript: "",
      summary: "",
      durationSeconds: "",
      callSuccessful: "",
      endedAt: "",
    },
  },
);

console.log(
  `phoneKey set on ${keyed}; pipeline defaults on ${defaults.modifiedCount}; transcript fields removed from ${stripped.modifiedCount}`,
);
process.exit(0);
```

Add to `package.json` scripts:

```json
"seed:backfill": "node --experimental-strip-types --no-warnings --env-file=.env.local scripts/backfill-leads.ts"
```

- [ ] **Step 7: Delete the test leads, then run the backfill**

The two `Test Lead` rows on `+15550000001` are development junk and their presence would create a misleading `phoneKey`. Remove them first:

```bash
node --experimental-strip-types --no-warnings --env-file=.env.local -e 'import("./lib/mongodb.ts").then(async (m) => { const db = await m.getDb(); const r = await db.collection("leads").deleteMany({ phone: "+15550000001" }); console.log("deleted", r.deletedCount); process.exit(0); })'
```

Then:

```bash
npm run seed:backfill
```

Expected: a line reporting the counts. Run it a second time — the counts must all be `0`.

- [ ] **Step 8: Commit**

```bash
git add lib/lead.ts lib/lead-store.ts scripts/backfill-leads.ts tests/lead-stage.test.ts package.json
git commit -m "A lead is a person, not a submission

Putting a pipeline on a lead only works if a lead is a human being. Status
cannot live on a conversation: someone rings twice and there are two
statuses with no answer to which is true. So \`phoneKey\` is unique and both
intake paths find-or-create — submit the form twice and you are one person
with two calls.

Races are settled by the index rather than by looking first. Two concurrent
submissions from one number would both see nothing and both insert; the
loser catches the duplicate and re-reads, which is correct under concurrency
in a way that check-then-insert never is.

A returning caller never overwrites what we already know. Only genuinely
empty fields get filled, because someone giving less detail the second time
should not erase the first.

Notes append and never edit. A pipeline whose history can be quietly
rewritten is worth less than one that cannot.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: One intake path for both delivery routes

**Files:**
- Create: `lib/call-intake.ts`

**Interfaces:**
- Consumes: `parseConversation`, `phoneKey`, `ParsedCall` from `lib/call-payload.ts`; `insertCallIfNew` from `lib/call-store.ts`; `findOrCreateLeadByPhone`, `advanceStageOnContact` from `lib/lead-store.ts`
- Produces:
  - `type IntakeResult = { stored: boolean; reason: "stored" | "duplicate" | "unparseable" }`
  - `function recordConversation(payload: unknown, source: "webhook" | "sync"): Promise<IntakeResult>`

- [ ] **Step 1: Write the intake**

Create `lib/call-intake.ts`:

```ts
import { getDb } from "./mongodb.ts";
import {
  parseConversation,
  phoneKey,
  type CallDirection,
  type ParsedCall,
} from "./call-payload.ts";
import { insertCallIfNew } from "./call-store.ts";
import {
  advanceStageOnContact,
  findOrCreateLeadByPhone,
} from "./lead-store.ts";

/**
 * Recording a conversation, however it reached us.
 *
 * The webhook and the reconciliation cron both land here. That is the point:
 * two paths that stored calls slightly differently would give an archive where
 * the record depends on which pipe happened to deliver it, and the whole
 * purpose of the cron is that a call recovered late is indistinguishable from
 * one that arrived on time.
 */

export type IntakeResult = {
  stored: boolean;
  reason: "stored" | "duplicate" | "unparseable";
};

export async function recordConversation(
  payload: unknown,
  source: "webhook" | "sync",
): Promise<IntakeResult> {
  const parsed = parseConversation(payload);
  if (!parsed) return { stored: false, reason: "unparseable" };

  const direction = await resolveDirection(parsed);
  const key = phoneKey(parsed.counterpartyNumber);

  const { lead } = await findOrCreateLeadByPhone({
    name: "",
    business: "",
    phone: parsed.counterpartyNumber,
    email: "",
    source: direction === "inbound" ? "inbound" : "form",
    ipHash: "",
  });

  const call = await insertCallIfNew({
    conversationId: parsed.conversationId,
    direction,
    counterpartyNumber: parsed.counterpartyNumber,
    counterpartyKey: key,
    agentId: parsed.agentId,
    leadId: lead.id,
    name: lead.name,
    callSuccessful: parsed.callSuccessful,
    startedAt: parsed.startedAt,
    durationSeconds: parsed.durationSeconds,
    transcript: parsed.transcript,
    summary: parsed.summary,
    source,
  });

  // Already stored. Nothing further to do — the lead was updated the first
  // time and doing it again would be a second write for no new information.
  if (!call) return { stored: false, reason: "duplicate" };

  await markLeadSpokenTo(lead.id, parsed.conversationId);
  await advanceStageOnContact(lead.id);

  return { stored: true, reason: "stored" };
}

/**
 * Inbound or outbound.
 *
 * The provider's own field first. When it is absent the fallback cannot be
 * wrong: a lead already carrying this conversation id got it from our own
 * dispatch, so the call went out. Anything else came in. That holds whatever
 * the provider renames its metadata to.
 */
async function resolveDirection(parsed: ParsedCall): Promise<CallDirection> {
  if (parsed.direction) return parsed.direction;

  const db = await getDb();
  const dispatched = await db
    .collection("leads")
    .findOne(
      { conversationId: parsed.conversationId },
      { projection: { _id: 1 } },
    );

  return dispatched ? "outbound" : "inbound";
}

/**
 * A conversation happened, so the lead has been spoken to.
 *
 * `conversationId` is only set when it is currently empty: an inbound lead
 * that later gets called back must keep pointing at whichever conversation
 * first claimed it, or the direction fallback above starts lying.
 */
async function markLeadSpokenTo(
  leadId: string,
  conversationId: string,
): Promise<void> {
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  await db.collection("leads").updateOne(
    { _id: new ObjectId(leadId) },
    {
      $set: { callStatus: "completed", failureReason: "" },
      $setOnInsert: {},
    },
  );
  await db
    .collection("leads")
    .updateOne(
      { _id: new ObjectId(leadId), conversationId: "" },
      { $set: { conversationId } },
    );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add lib/call-intake.ts
git commit -m "Record a call the same way however it arrived

The webhook and the reconciliation cron both land in one function, because
two paths storing calls slightly differently would give an archive where the
record depends on which pipe delivered it. The entire point of the cron is
that a call recovered late is indistinguishable from one that arrived on
time.

Direction resolves from the provider's field when it is there and from
whether a lead already claims the conversation when it is not. The fallback
cannot be wrong: a lead carrying this conversation id got it from our own
dispatch, so the call went out. That survives the provider renaming anything.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The webhook, renamed, with the old path kept alive

**Files:**
- Create: `app/api/calls/webhook/route.ts`
- Rewrite: `app/api/lead/callback/route.ts` (becomes a delegating alias)

**Interfaces:**
- Consumes: `verifyWebhook` from `lib/elevenlabs.ts`; `recordConversation` from `lib/call-intake.ts`
- Produces: `POST` handler exported from `app/api/calls/webhook/route.ts`, re-exported by the alias

- [ ] **Step 1: Write the new webhook**

Create `app/api/calls/webhook/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/elevenlabs";
import { recordConversation } from "@/lib/call-intake";

/**
 * Where every call comes back — inbound and outbound alike.
 *
 * Set this as the post-call webhook in the ElevenLabs dashboard:
 *
 *     https://bluex.agency/api/calls/webhook
 *
 * Public, unauthenticated, and it writes down what a customer said, so the
 * signature check runs first and a request that fails it is refused rather
 * than logged and accepted.
 */

export async function POST(request: Request) {
  // Read as text, not JSON. The signature covers the exact bytes sent, and
  // re-serialising a parsed object produces different ones often enough to
  // matter — a failure that looks nothing like its cause.
  const raw = await request.text();

  const verified = verifyWebhook(
    raw,
    request.headers.get("elevenlabs-signature"),
  );
  if (!verified.ok) {
    console.error("[calls/webhook] rejected:", verified.reason);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await recordConversation(payload, "webhook");

    if (result.reason === "unparseable") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // A duplicate is a success. The provider retries on anything else, and
    // retrying a call we already hold would loop forever.
    return NextResponse.json({ ok: true, stored: result.stored });
  } catch (error) {
    // 5xx on purpose: the provider retries on one, and losing a transcript to
    // a transient database blip is exactly what retries are for.
    console.error("[calls/webhook] could not record:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
```

- [ ] **Step 2: Turn the old route into an alias**

Replace the entire contents of `app/api/lead/callback/route.ts`:

```ts
import { POST as handler } from "@/app/api/calls/webhook/route";

/**
 * The old post-call webhook path. Deprecated — use `/api/calls/webhook`.
 *
 * Kept alive deliberately, and this is not politeness. The provider's webhook
 * URL lives in their dashboard, not in this repo, so deploying the rename
 * without updating it there would silently drop every call until somebody
 * noticed — the precise opposite of the goal this endpoint exists to serve.
 *
 * Delete this file once the dashboard is confirmed pointing at the new path
 * and the warning below has stopped appearing in the logs.
 */
export async function POST(request: Request) {
  console.warn(
    "[lead/callback] deprecated path used — repoint the ElevenLabs post-call " +
      "webhook at /api/calls/webhook, then delete app/api/lead/callback/",
  );
  return handler(request);
}
```

- [ ] **Step 3: Verify both paths reject an unsigned request**

Start the dev server if it is not running (`npm run dev`), then:

```bash
curl -s -o /dev/null -w 'new: %{http_code}\n' -X POST http://localhost:3000/api/calls/webhook -H 'content-type: application/json' -d '{}' && curl -s -o /dev/null -w 'alias: %{http_code}\n' -X POST http://localhost:3000/api/lead/callback -H 'content-type: application/json' -d '{}'
```

Expected: `new: 401` and `alias: 401`

- [ ] **Step 4: Verify a signed inbound payload creates a lead and a call**

Set `ELEVENLABS_WEBHOOK_SECRET` in `.env.local` to any value first. Then:

```bash
node --env-file=.env.local -e 'const c=require("crypto");const body=JSON.stringify({type:"post_call_transcription",data:{conversation_id:"conv_inbound_1",agent_id:"agent_1",metadata:{call_duration_secs:37,start_time_unix_secs:Math.floor(Date.now()/1000),phone_call:{direction:"inbound",external_number:"+15551230001"}},transcript:[{role:"agent",message:"Thanks for calling BlueX.",time_in_call_secs:1},{role:"user",message:"I need a Shopify store.",time_in_call_secs:5}],analysis:{transcript_summary:"Wants a Shopify store.",call_successful:"success"}}});const t=Math.floor(Date.now()/1000);const sig=c.createHmac("sha256",process.env.ELEVENLABS_WEBHOOK_SECRET).update(t+"."+body).digest("hex");fetch("http://localhost:3000/api/calls/webhook",{method:"POST",headers:{"content-type":"application/json","elevenlabs-signature":`t=${t},v0=${sig}`},body}).then(r=>r.json()).then(console.log)'
```

Expected: `{ ok: true, stored: true }`

- [ ] **Step 5: Verify idempotency — the guarantee everything else rests on**

Run the exact same command again.

Expected: `{ ok: true, stored: false }`

Then confirm exactly one call and one lead exist:

```bash
node --experimental-strip-types --no-warnings --env-file=.env.local -e 'import("./lib/mongodb.ts").then(async (m) => { const db = await m.getDb(); console.log("calls:", await db.collection("calls").countDocuments({ conversationId: "conv_inbound_1" })); console.log("leads:", await db.collection("leads").countDocuments({ phoneKey: "15551230001" })); process.exit(0); })'
```

Expected: `calls: 1` and `leads: 1`

- [ ] **Step 6: Commit**

```bash
git add app/api/calls/webhook/route.ts app/api/lead/callback/route.ts
git commit -m "Stop throwing away the calls nobody asked us to make

The webhook already received inbound conversations and discarded any it
could not match to a lead. Tracking them was mostly a matter of no longer
doing that.

The old path stays as a delegating alias that logs where to go instead. The
provider's webhook URL lives in their dashboard rather than this repo, so
shipping the rename alone would silently drop every call until somebody
noticed — which is the precise opposite of what this endpoint is for. It
comes out once the dashboard is confirmed moved.

A duplicate delivery answers 200. The provider retries on anything else, and
retrying a call we already hold would loop forever.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Reconciliation — the cron that catches what the webhook drops

**Files:**
- Modify: `lib/elevenlabs.ts` (add two fetches)
- Create: `lib/call-sync.ts`
- Create: `app/api/cron/call-sync/route.ts`

**Interfaces:**
- Consumes: `recordConversation` from `lib/call-intake.ts`; `hasCall` from `lib/call-store.ts`
- Produces:
  - `function listConversations(pageSize?: number): Promise<{ ok: true; ids: string[] } | { ok: false; reason: string }>`
  - `function getConversation(id: string): Promise<{ ok: true; payload: unknown } | { ok: false; reason: string }>`
  - `type CallSyncResult = { ok: boolean; imported: number; message?: string }`
  - `function syncCalls(): Promise<CallSyncResult>`
  - `function getCallSyncState(): Promise<{ lastRunAt: string | null; lastError: string | null; configured: boolean }>`

- [ ] **Step 1: Add the two fetches to the ElevenLabs client**

Append to `lib/elevenlabs.ts`, above the webhook-verification section:

```ts
/* ── Reading conversations back ──────────────────────────────────────────── */

/**
 * Recent conversation ids, newest first.
 *
 * Ids only. The list endpoint does not carry transcripts, and pretending it
 * might would mean two shapes to parse for one kind of object — so the sync
 * fetches each one properly rather than storing half a record.
 */
export async function listConversations(
  pageSize = 50,
): Promise<{ ok: true; ids: string[] } | { ok: false; reason: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, reason: "ElevenLabs credentials are not set." };

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE}/conversations?page_size=${Math.min(pageSize, 100)}`,
      {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      },
    );
  } catch (error) {
    console.error("[elevenlabs] list threw:", error);
    return { ok: false, reason: "Could not reach the voice provider." };
  }

  const body = await readJson(response);
  if (!response.ok) {
    return { ok: false, reason: extractError(body) || `HTTP ${response.status}` };
  }

  const rows = pickArray(body, "conversations");
  const ids = rows
    .map((row) => stringField(row, "conversation_id"))
    .filter((id) => id.length > 0);

  return { ok: true, ids };
}

export async function getConversation(
  id: string,
): Promise<{ ok: true; payload: unknown } | { ok: false; reason: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, reason: "ElevenLabs credentials are not set." };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[elevenlabs] fetch threw:", error);
    return { ok: false, reason: "Could not reach the voice provider." };
  }

  const body = await readJson(response);
  if (!response.ok) {
    return { ok: false, reason: extractError(body) || `HTTP ${response.status}` };
  }
  return { ok: true, payload: body };
}

function pickArray(body: unknown, key: string): unknown[] {
  if (typeof body !== "object" || body === null) return [];
  const value = (body as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}
```

- [ ] **Step 2: Write the sync**

Create `lib/call-sync.ts`:

```ts
import { getDb } from "./mongodb.ts";
import { hasCall } from "./call-store.ts";
import { recordConversation } from "./call-intake.ts";
import { getConversation, isConfigured, listConversations } from "./elevenlabs.ts";

/**
 * Reconciliation.
 *
 * Webhooks get missed — a deploy, a restart, a network blip — and a missed one
 * is silent, which is the problem. This walks recent conversations and stores
 * anything the webhook did not deliver. The unique index does the deciding, so
 * running this while a webhook is arriving is safe.
 *
 * Bounded to one page per run. An unbounded backfill against a paid API is a
 * bill nobody approved, and the cron runs often enough that one page is ample.
 */

const PAGE_SIZE = 50;
const STATE_ID = "callSync";

export type CallSyncResult = { ok: boolean; imported: number; message?: string };

export async function syncCalls(): Promise<CallSyncResult> {
  if (!isConfigured()) {
    return { ok: false, imported: 0, message: "The voice agent is not configured." };
  }

  const listed = await listConversations(PAGE_SIZE);
  if (!listed.ok) {
    await recordState(listed.reason);
    return { ok: false, imported: 0, message: listed.reason };
  }

  let imported = 0;
  let lastError: string | null = null;

  for (const id of listed.ids) {
    // Cheap check first. Skipping a conversation we already hold avoids paying
    // for a detail fetch on every call in the archive, every ten minutes.
    if (await hasCall(id)) continue;

    const fetched = await getConversation(id);
    if (!fetched.ok) {
      // One bad conversation must not abandon the rest of the page.
      lastError = fetched.reason;
      console.error("[call-sync] could not fetch", id, fetched.reason);
      continue;
    }

    try {
      const result = await recordConversation(fetched.payload, "sync");
      if (result.stored) imported += 1;
    } catch (error) {
      lastError = "Could not store a conversation.";
      console.error("[call-sync] could not store", id, error);
    }
  }

  await recordState(lastError);
  return { ok: true, imported, message: lastError ?? undefined };
}

async function recordState(lastError: string | null): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("siteSettings").updateOne(
      { _id: STATE_ID },
      { $set: { lastRunAt: new Date(), lastError } },
      { upsert: true },
    );
  } catch (error) {
    // Losing the bookkeeping must not fail the sync that succeeded.
    console.error("[call-sync] could not record state:", error);
  }
}

export async function getCallSyncState(): Promise<{
  lastRunAt: string | null;
  lastError: string | null;
  configured: boolean;
}> {
  let doc: { lastRunAt?: Date; lastError?: string | null } | null = null;
  try {
    const db = await getDb();
    doc = await db.collection("siteSettings").findOne({ _id: STATE_ID });
  } catch (error) {
    console.error("[call-sync] could not read state:", error);
  }

  return {
    lastRunAt: doc?.lastRunAt ? doc.lastRunAt.toISOString() : null,
    lastError: doc?.lastError ?? null,
    configured: isConfigured(),
  };
}
```

Note: `siteSettings` uses string `_id` values elsewhere in this codebase (`lib/contact-store.ts` uses `"contact"`), so the `_id: STATE_ID` above matches the established convention. TypeScript may need `as never` on the filter if the driver's generic complains; prefer typing the collection as `Collection<{ _id: string; lastRunAt?: Date; lastError?: string | null }>` rather than casting.

- [ ] **Step 3: Write the cron route**

Create `app/api/cron/call-sync/route.ts` — a direct parallel of `app/api/cron/inbox-sync/route.ts`:

```ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncCalls } from "@/lib/call-sync";

/**
 * The scheduled call reconciliation. Point a cron at this every 5–15 minutes.
 *
 * Behind the same shared secret as the mail sync, for the same reason: a
 * scheduler has no session, and an unauthenticated endpoint that makes paid
 * upstream API calls is a way to spend someone else's money from the outside.
 *
 * With `CRON_SECRET` unset it refuses everything. "We forgot to set it" must
 * not be the same as "anyone may call it".
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;

  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await syncCalls();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export const GET = run;
export const POST = run;
```

- [ ] **Step 4: Verify the auth gate**

```bash
curl -s -o /dev/null -w 'no token: %{http_code}\n' -X POST http://localhost:3000/api/cron/call-sync
```

Expected: `no token: 401`

With a token (set `CRON_SECRET` in `.env.local` first):

```bash
curl -s -X POST http://localhost:3000/api/cron/call-sync -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)" -w '\n'
```

Expected: JSON with `ok` and `imported`. If the ElevenLabs list endpoint path is wrong you will see a `reason` naming an HTTP status — that is the field-name correction the spec warned about, and it is fixed here, not worked around.

- [ ] **Step 5: Commit**

```bash
git add lib/elevenlabs.ts lib/call-sync.ts app/api/cron/call-sync/route.ts
git commit -m "Catch the calls the webhook drops

A missed webhook is silent, and silence is the problem — there is nothing to
tell you a conversation happened and went unrecorded. This walks recent
conversations and stores anything missing, which is what makes \"every call\"
true rather than aspirational.

It is safe to run against an arriving webhook because neither path checks
whether the other got there first; the unique index decides. Bounded to one
page a run, because an unbounded backfill against a paid API is a bill
nobody approved.

One conversation failing to fetch does not abandon the rest of the page. The
error is remembered and reported in the panel rather than thrown away.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Admin APIs for calls and the pipeline

**Files:**
- Create: `app/api/admin/calls/route.ts`
- Create: `app/api/admin/calls/sync/route.ts`
- Create: `app/api/admin/leads/[id]/route.ts`
- Create: `app/api/admin/leads/[id]/notes/route.ts`
- Modify: `app/api/admin/leads/route.ts` (swap the count function)

**Interfaces:**
- Consumes: `requireAdmin` from `lib/admin-guard`; `listCalls`, `getCallByConversationId` from `lib/call-store`; `syncCalls`, `getCallSyncState` from `lib/call-sync`; `setLeadStage`, `setLeadFollowUp`, `appendLeadNote`, `needsAttentionCount` from `lib/lead-store`; `getSessionUser`, `SESSION_COOKIE` from `lib/admin-auth`
- Produces: JSON contracts consumed by Tasks 8 and 9 —
  - `GET /api/admin/calls` → `{ ok, calls: Call[], sync: { lastRunAt, lastError, configured } }`
  - `GET /api/admin/calls?conversation=<id>` → `{ ok, call: Call | null }`
  - `POST /api/admin/calls/sync` → `{ ok, imported, message? }`
  - `PATCH /api/admin/leads/[id]` accepts `{ stage?, followUpAt? }` → `{ ok, lead }`
  - `POST /api/admin/leads/[id]/notes` accepts `{ body }` → `{ ok, lead }`

- [ ] **Step 1: Write the calls list route**

Create `app/api/admin/calls/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getCallByConversationId, listCalls } from "@/lib/call-store";
import { getCallSyncState } from "@/lib/call-sync";
import type { CallDirection } from "@/lib/call-payload";

function parseDirection(value: string | null): CallDirection | undefined {
  return value === "inbound" || value === "outbound" ? value : undefined;
}

/**
 * The archive: list, search, or one call by conversation id.
 *
 * The single-call lookup shares this route rather than getting its own,
 * because the Leads panel wants exactly one thing — the call behind a lead —
 * and a second endpoint for a one-line query is a second thing to keep in step.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;

  const conversation = params.get("conversation");
  if (conversation) {
    try {
      return NextResponse.json({
        ok: true,
        call: await getCallByConversationId(conversation),
      });
    } catch (error) {
      console.error("[calls] lookup failed:", error);
      return NextResponse.json(
        { ok: false, message: "Could not load that call." },
        { status: 503 },
      );
    }
  }

  try {
    const [calls, sync] = await Promise.all([
      listCalls({
        direction: parseDirection(params.get("direction")),
        query: params.get("q") ?? undefined,
        leadId: params.get("lead") ?? undefined,
      }),
      getCallSyncState(),
    ]);

    return NextResponse.json({ ok: true, calls, sync });
  } catch (error) {
    console.error("[calls] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the calls." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 2: Write the manual sync route**

Create `app/api/admin/calls/sync/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { syncCalls } from "@/lib/call-sync";

/**
 * The Refresh button. Same work the cron does, behind the session guard
 * instead of the shared secret — so the archive is usable before anyone has
 * wired up a scheduler.
 */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await syncCalls();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
```

- [ ] **Step 3: Write the lead PATCH route**

Create `app/api/admin/leads/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getLead,
  setLeadFollowUp,
  setLeadStage,
  type LeadStage,
} from "@/lib/lead-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "won", "lost"];

function parseStage(value: unknown): LeadStage | null {
  return typeof value === "string" && STAGES.includes(value as LeadStage)
    ? (value as LeadStage)
    : null;
}

/**
 * Stage and follow-up date.
 *
 * A closed set, checked here rather than trusted: `stage` drives the sidebar
 * badge's query, and an arbitrary string written into it would produce a lead
 * that no filter can ever surface again.
 */
export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: { stage?: unknown; followUpAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  try {
    if (body.stage !== undefined) {
      const stage = parseStage(body.stage);
      if (!stage) {
        return NextResponse.json(
          { ok: false, message: "Unknown stage." },
          { status: 422 },
        );
      }
      const ok = await setLeadStage(id, stage);
      if (!ok) {
        return NextResponse.json(
          { ok: false, message: "No such lead." },
          { status: 404 },
        );
      }
    }

    if (body.followUpAt !== undefined) {
      // Null clears it. An empty string is what a cleared date input sends,
      // and treating it as "1970" would make every lead permanently overdue.
      const raw = body.followUpAt;
      const at =
        raw === null || raw === ""
          ? null
          : new Date(String(raw));

      if (at && Number.isNaN(at.getTime())) {
        return NextResponse.json(
          { ok: false, message: "That date could not be read." },
          { status: 422 },
        );
      }
      await setLeadFollowUp(id, at);
    }

    return NextResponse.json({ ok: true, lead: await getLead(id) });
  } catch (error) {
    console.error("[leads] patch failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save that." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 4: Write the notes route**

Create `app/api/admin/leads/[id]/notes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-guard";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { appendLeadNote, getLead } from "@/lib/lead-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

/**
 * Appends a note.
 *
 * The author is taken from the session, never from the request body. A note
 * saying who wrote it is only worth anything if the writer could not choose
 * what it says.
 */
export async function POST(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: { body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json(
      { ok: false, message: "A note needs something in it." },
      { status: 422 },
    );
  }

  try {
    const store = await cookies();
    const user = await getSessionUser(store.get(SESSION_COOKIE)?.value);

    const ok = await appendLeadNote(id, {
      body: text,
      author: user?.email ?? "unknown",
    });
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "No such lead." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, lead: await getLead(id) });
  } catch (error) {
    console.error("[leads] note failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save that note." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 5: Swap the count in the existing leads route**

In `app/api/admin/leads/route.ts`, change the import from `attentionLeadCount` to `needsAttentionCount` and update the call site inside `Promise.all`. Everything else in that file stays.

- [ ] **Step 6: Verify every route rejects an unauthenticated request**

```bash
for p in "/api/admin/calls" "/api/admin/calls/sync" "/api/admin/leads/000000000000000000000000" "/api/admin/leads/000000000000000000000000/notes"; do curl -s -o /dev/null -w "$p %{http_code}\n" -X POST "http://localhost:3000$p" -H 'content-type: application/json' -d '{}'; done
```

Expected: `401` on every line.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/calls app/api/admin/leads
git commit -m "Give the panel something to read and something to change

The single-call lookup shares the list route rather than getting its own.
The Leads panel wants exactly one thing — the call behind a lead — and a
second endpoint for a one-line query is a second thing to keep in step.

Stage is checked against a closed set rather than trusted. It drives the
badge's query, and an arbitrary string written into it produces a lead no
filter can ever surface again.

A note's author comes from the session and never from the body. A note
saying who wrote it is worth nothing if the writer picked the name.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The Calls panel

**Files:**
- Create: `components/ui/admin-calls.tsx`
- Modify: `components/ui/dashboard-with-collapsible-sidebar.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/calls`, `POST /api/admin/calls/sync`; `Call` type from `lib/call-store`
- Produces: `export function AdminCalls(): JSX.Element`

- [ ] **Step 1: Build the panel**

Create `components/ui/admin-calls.tsx`. Follow `components/ui/admin-leads.tsx` exactly for structure — the reload-key refetch pattern, the `cancelled` guard, the `Banner` component, the list/detail split that collapses to one pane on a phone. Requirements specific to this panel:

- **State:** `query`, `direction` (`"" | "inbound" | "outbound"`), `calls`, `selectedId`, `sync`, `loading`, `syncing`, `error`, `notice`, `reloadKey`.
- **The search box must not fire a request per keystroke.** Hold the typed value in `query` and only push it into the fetch on submit (an actual `<form onSubmit>`) or after a 300ms debounce inside the effect. A debounce belongs in the effect, not in an event handler, because the effect already owns cancellation.
- **The effect owns every `setState` after the await.** `reload()` sets `loading` and bumps `reloadKey`; the effect clears `loading` in its `finally`. This repo's lint rejects a `setState` reached synchronously from an effect body.
- **`selected` is derived**, not stored: `calls.find((c) => c.id === selectedId) ?? null`. Storing the object means the detail pane keeps showing stale data after a refetch.
- **Direction pill classes written out in full** — Tailwind never sees a templated class name:

```tsx
const DIRECTION_STYLES = {
  inbound: {
    label: "Inbound",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  outbound: {
    label: "Outbound",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
} as const;
```

- **Transcript rendering.** Alternating turns, agent tinted, user plain. Use the turn index as the key — a transcript is an ordered log written once and never reordered, so there is no identity to preserve. Colour the speaker label to match its own bubble; grey text on a tinted background reads as washed out:

```tsx
<li
  key={index}
  className={`rounded-lg px-3 py-2 text-sm ${
    turn.role === "agent"
      ? "bg-blue-50 text-blue-950 dark:bg-blue-900/20 dark:text-blue-50"
      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  }`}
>
  <span
    className={`mr-2 text-[0.65rem] font-medium uppercase tracking-wide ${
      turn.role === "agent"
        ? "text-blue-700 dark:text-blue-300"
        : "text-gray-600 dark:text-gray-400"
    }`}
  >
    {turn.role === "agent" ? "Agent" : "Caller"}
  </span>
  {turn.message}
</li>
```

- **Empty states must distinguish their causes.** "No calls yet" and "Nothing matched that search" are different facts; so is "the voice agent is not configured", which comes from `sync.configured` and gets an amber `Banner` exactly as the Leads panel does.
- **Report the sync.** When `sync.lastError` is set, show it. When `sync.lastRunAt` is null, say reconciliation has never run.
- **Scrolling containers state both axes:** `overflow: hidden auto` via `className="overflow-hidden overflow-y-auto"`.
- **A "Call back" button** on the detail pane posting to `/api/admin/leads/${call.leadId}/call`, and a link that switches to the Leads panel for that lead.

- [ ] **Step 2: Wire it into the sidebar**

In `components/ui/dashboard-with-collapsible-sidebar.tsx`:

1. `import { AdminCalls } from "@/components/ui/admin-calls";`
2. Add `PhoneIncoming` to the lucide import list.
3. Add an `Option` for `"Calls"` directly below `"Leads"`, with no `notifs` prop — "unread" is not a concept that applies to an archive.
4. Add to `VIEWS`:

```ts
Calls: {
  title: "Calls",
  subtitle: "Every conversation the agent has had, inbound and outbound",
},
```

5. Render it: `{selected === "Calls" && <AdminCalls />}`

- [ ] **Step 3: Verify it builds and the lint stays clean**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; lint reports only the 2 pre-existing problems in `components/ui/modal.tsx` and `lib/mongodb.ts`. **Any new lint error must be fixed, not accepted** — `react-hooks/set-state-in-effect` blocks the build.

- [ ] **Step 4: Verify the search actually filters**

With the dev server running and signed in at `/admin`, open Calls and search `Shopify`. The seeded `conv_inbound_1` call from Task 5 must appear. Search `zzzznothing` — the list must be empty, not full.

If a text-search query errors, the index has not been built; re-run the Task 2 Step 3 command to force `ensureIndexes`.

- [ ] **Step 5: Commit**

```bash
git add components/ui/admin-calls.tsx components/ui/dashboard-with-collapsible-sidebar.tsx
git commit -m "Read every conversation in one place

The archive gets a search box and a direction filter, and it reports when
reconciliation last ran and whether it failed — an empty list because
nobody called and an empty list because the sync has been broken for a week
look identical otherwise, and only one of them is something to fix.

No badge. Unread is not a concept that applies to an archive, and a count
that only ever goes up is noise wearing a notification's clothes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: The Leads panel becomes a working surface

**Files:**
- Modify: `components/ui/admin-leads.tsx`
- Modify: `app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/admin/leads/[id]`, `POST /api/admin/leads/[id]/notes`, `GET /api/admin/calls?lead=<id>`; `needsAttentionCount` from `lib/lead-store`
- Produces: nothing new for later tasks

- [ ] **Step 1: Swap the server-side count**

In `app/(admin)/admin/page.tsx`, change the import and the `Promise.all` entry from `attentionLeadCount()` to `needsAttentionCount()`. The prop is still called `attention`.

- [ ] **Step 2: Remove the dead transcript rendering**

In `components/ui/admin-leads.tsx`, delete the blocks reading `lead.transcript`, `lead.summary`, `lead.durationSeconds` and `lead.callSuccessful` — those fields no longer exist and `tsc` will point at each one.

- [ ] **Step 3: Fetch the lead's calls when a lead is opened**

Add state `calls: Call[]` and `loadingCalls: boolean`. In an effect keyed on `selectedId`, fetch `/api/admin/calls?lead=${selectedId}` when a lead is selected, clearing to `[]` when none is. Same `cancelled` guard and same `finally` as the list effect — a lead switched while a fetch is in flight must not paint the previous lead's calls.

Render each call as a collapsible block: direction, when, duration, summary, then the transcript using the exact markup from Task 8 Step 1.

- [ ] **Step 4: Add the stage selector**

A `<select>` of the five stages, posting `PATCH` on change and calling `reload()` after. Stage pill classes written out in full:

```tsx
const STAGE_STYLES = {
  new: { label: "New", className: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  contacted: { label: "Contacted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  qualified: { label: "Qualified", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  won: { label: "Won", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
} as const;
```

- [ ] **Step 5: Add the follow-up date field**

An `<input type="date">` bound to `followUpAt` rendered as `YYYY-MM-DD`, posting `PATCH` on change. A clear button sends `null`.

Overdue dates must be visibly overdue — red text plus the word "overdue", never colour alone.

- [ ] **Step 6: Add the notes block**

A textarea and an Add button posting to the notes route, then `reload()`. Render existing notes newest first with author and timestamp. State plainly beneath the box that notes cannot be edited or deleted, so nobody discovers that by trying.

- [ ] **Step 7: Add a "Needs you" filter**

Change the existing filter labels to `All` / `Needs you` / `Called`, mapping to the same `filter` values (`all`, `attention`, `completed`). The label changes because the meaning did — it now includes overdue follow-ups, not just uncalled leads.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean types, only the 2 pre-existing lint problems, successful build.

Then in the browser at `/admin`: set a stage and confirm the pill changes; set a follow-up date in the past and confirm the lead appears under "Needs you" and the badge count rises; add a note and confirm it renders with your email and a timestamp; open the lead created by the Task 5 webhook test and confirm its inbound transcript renders.

- [ ] **Step 9: Commit**

```bash
git add components/ui/admin-leads.tsx "app/(admin)/admin/page.tsx"
git commit -m "Make the leads panel somewhere work happens

Stage, a follow-up date and notes, and the badge now means \"needs you\" —
never successfully called, or overdue for a chase, excluding anything
already won or lost. A closed deal with a stale date is not work.

Transcripts render from the calls collection rather than from fields the
lead no longer carries, so a person with three conversations shows three,
which is the thing the old shape could not do.

Overdue dates say the word overdue rather than relying on being red.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Documentation and the full verification sweep

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.env.example`

- [ ] **Step 1: Update the architecture notes**

In `CLAUDE.md`, replace the "The lead flow stores before it dials" paragraph with one covering the new shape: a lead is a person keyed by a unique `phoneKey`; a call is a conversation; `calls` holds every transcript; the unique index on `conversationId` is what lets the webhook and the cron both write; `lib/call-intake.ts` is the single recording path so a late-recovered call is indistinguishable from a prompt one.

Under "Open items", replace the ElevenLabs entry with the two things that are genuinely outstanding: the dashboard must point at `/api/calls/webhook` (after which `app/api/lead/callback/` should be deleted), and the agent must be attached to the number for **inbound** or nothing answers it.

- [ ] **Step 2: Document the cron**

In `.env.example`, extend the `CRON_SECRET` comment to name both jobs:

```
#   */3 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
#     https://bluex.agency/api/cron/inbox-sync
#   */10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
#     https://bluex.agency/api/cron/call-sync
```

- [ ] **Step 3: Run the whole suite**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all tests pass; no type errors; only the 2 pre-existing lint problems; build succeeds.

- [ ] **Step 4: Re-run the regression checks that predate this work**

```bash
curl -s -X POST http://localhost:3000/api/lead -H 'content-type: application/json' -d '{"name":"Regression Check","business":"Test Co","phone":"+15559990001","email":"r@example.com","source":"form"}' -w ' HTTP %{http_code}\n' && curl -s -X POST http://localhost:3000/api/lead -H 'content-type: application/json' -d '{"name":"X","business":"","phone":"12","email":"nope"}' -w ' HTTP %{http_code}\n' && curl -s -o /dev/null -w 'admin leads: %{http_code}\n' http://localhost:3000/api/admin/leads
```

Expected: the first returns `200` (or `502` if credentials are live and the fake number is refused — either proves the path works), the second `422` with per-field errors, the third `401`.

- [ ] **Step 5: Clean up the test data**

Remove every row created during this plan:

```bash
node --experimental-strip-types --no-warnings --env-file=.env.local -e 'import("./lib/mongodb.ts").then(async (m) => { const db = await m.getDb(); const calls = await db.collection("calls").deleteMany({ conversationId: /^conv_(inbound|fake)_/ }); const leads = await db.collection("leads").deleteMany({ phoneKey: { $in: ["15551230001", "15559990001", "15550000001"] } }); console.log("calls", calls.deletedCount, "leads", leads.deletedCount); process.exit(0); })'
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md .env.example
git commit -m "Write down the shape the call flow actually has now

A lead is a person and a call is a conversation, which is not what the
previous note said and not what the code did a week ago. The part worth
knowing before touching any of it is that two writers deliberately race for
every call and the unique index picks the winner — anyone who \"fixes\" that
by checking first will reintroduce the duplicates it exists to prevent.

Two things remain outside this repo and neither is optional: the provider's
webhook has to point at the new path before the old one is deleted, and the
agent has to be attached to the number for inbound or nothing answers it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage.** Every section of the spec maps to a task: `calls` collection → 2; `leads` widening and backfill → 3; direction resolution → 4; webhook and alias → 5; sync and cron → 6; admin routes → 7; Calls panel → 8; Leads pipeline UI and badge → 9; configuration and docs → 10. Search is specified in Task 2 (index and query routing) and exercised in Task 8 Step 4.

**Known deviation from the spec, deliberate.** The spec lists `PATCH /api/admin/leads/[id]` and the notes route separately from the calls routes; this plan builds them in one task (7) because they share the auth pattern and a reviewer would accept or reject them together.

**Where this plan is most likely to be wrong.** The ElevenLabs list and fetch endpoint paths in Task 6 Step 1 are unverified — they cannot be confirmed without live credentials and real conversations. Task 6 Step 4 is written to surface exactly that failure with the provider's own message rather than a generic error, and correcting the paths there is expected work, not a defect in the plan.
