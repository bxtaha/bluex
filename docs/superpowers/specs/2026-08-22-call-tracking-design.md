# Call tracking and follow-up — design

**Date:** 2026-08-22
**Status:** approved, not yet implemented
**Revision:** 2 — transcript search and a follow-up pipeline were added after
the first draft was approved as read-only. The data model changed materially as
a result; see "Why the model moved".

## The goal

Every conversation the voice agent has, in either direction, recorded and
readable as text — searchable, and attached to a person you can work through a
pipeline.

Two services exist today in different states:

1. **Outbound** — someone asks for a call on the site, `/api/lead` stores the
   lead and dispatches. Working.
2. **Inbound** — someone dials the published number and the agent answers.
   Does not exist. Requires the agent to be attached to the number for inbound
   in the ElevenLabs dashboard.

## The insight this rests on

The post-call webhook already receives inbound calls. `/api/lead/callback`
fires for every conversation, and when it cannot match one to a lead it logs
`no lead for conversation` and discards it. Inbound tracking is mostly a matter
of no longer throwing that data away.

## Why the model moved

Revision 1 treated a call as the unit of everything. Adding pipeline status and
follow-up dates broke that, and it is worth writing down why so nobody
reintroduces it.

Status cannot live on a call. Someone rings twice: two calls, two statuses,
and no answer to which one is true. Call a lead back: one person, two
conversations, a stage that contradicts itself. **Follow-up state describes a
person, not a conversation.**

Rather than introduce a third collection, `leads` widens from *"someone who
asked to be called"* to *"someone we have spoken to, or who asked us to."* An
inbound call finds-or-creates a lead by phone number and attaches itself.

Each panel then has a job the other does not:

- **Leads** — every person. Stage, follow-up date, notes, call history. The
  working surface.
- **Calls** — every conversation. The searchable archive.

## Data model

### New: `calls`

One document per conversation. The single home for transcripts.

```ts
export type CallDirection = "inbound" | "outbound";

export type TranscriptTurn = {
  role: "agent" | "user";
  message: string;
  /** Seconds from the start of the call. */
  at: number;
};

export type Call = {
  id: string;
  /** The provider's handle. Unique — the dedupe key for both write paths. */
  conversationId: string;
  direction: CallDirection;

  /** The other end: the caller for inbound, the person dialled for outbound. */
  counterpartyNumber: string;
  /** Digits only. The join key to a lead. */
  counterpartyKey: string;
  agentId: string;

  /** Always set — every call belongs to a lead now, inbound included. */
  leadId: string;
  /** Denormalised for the list and for the text index. */
  name: string;

  /**
   * The agent's own verdict on whether the call achieved its purpose. There is
   * deliberately no second "did it happen" field beside this: a call we hold a
   * transcript for, happened.
   */
  callSuccessful: "success" | "failure" | "unknown";
  startedAt: Date;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string;

  /** Which path delivered this. Makes a silent webhook failure visible. */
  source: "webhook" | "sync";
  createdAt: Date;
};
```

**Indexes**

| index | why |
|---|---|
| `{ conversationId: 1 }` **unique** | the entire reliability story — see below |
| `{ startedAt: -1 }` | the default list order |
| `{ direction: 1, startedAt: -1 }` | the inbound/outbound filters |
| `{ leadId: 1, startedAt: -1 }` | a lead's call history |
| `$text` on `transcript.message`, `summary`, `name` | search |

The list sorts on `startedAt`, **not** `createdAt`. A call recovered by the
cron is inserted long after it happened, and ordering by insertion time would
file it under the wrong day.

The unique index on `conversationId` is what makes the webhook and the cron
safe to run against each other: the second writer collides instead of
duplicating. This is the same mechanism `message-store.ts` already uses on
`messageId` to make IMAP sync idempotent. First writer wins — both paths write
complete records, so there is nothing to merge.

### Changed: `leads`

**Removed** (they move to `calls`): `transcript`, `summary`, `durationSeconds`,
`callSuccessful`, `endedAt`.

**Added:**

```ts
export type LeadSource = "form" | "inline" | "inbound";
export type LeadStage = "new" | "contacted" | "qualified" | "won" | "lost";

type LeadAdditions = {
  /** Digits only. Unique — one lead per human. */
  phoneKey: string;
  stage: LeadStage;
  /** When to chase. Null when nothing is scheduled. */
  followUpAt: Date | null;
  notes: { body: string; at: Date; author: string }[];
};
```

**Kept**, unchanged: everything else, including `conversationId`.

**`phoneKey` is unique**, and this is a behaviour change worth stating plainly:
both the web form and inbound calls now *find or create* rather than always
insert. A person who submits the form twice is one lead with two calls, not two
leads — which is the entire point of moving the pipeline onto the person. The
existing rate limits still prevent submission spam.

`callStatus` stays and does not clash with `stage`. `callStatus` tracks
dispatch — did our outbound call go out. `stage` tracks where someone is
commercially. Different axes; a lead can be `completed` and `qualified` at once.
For a lead created by an inbound call, `callStatus` is `completed`, which is
literally accurate: the post-call webhook did arrive.

**Stage advances once, automatically.** A lead sitting at `new` moves to
`contacted` when a call completes. It never moves backward and never overrides
a stage set by hand — an agent conversation is evidence of contact, not of
qualification.

**Notes are append-only.** No edit, no delete. A note is a record of what was
said at a time, and a pipeline whose history can be quietly rewritten is worth
less than one that cannot.

Migration cost is near zero. The only documents carrying the removed fields are
test rows being deleted anyway. Existing leads need `phoneKey`, `stage`,
`followUpAt` and `notes` backfilled — a one-off script, specified below.

## Determining direction

The payload is expected to carry phone metadata naming the direction, but the
exact field names are unverified — they cannot be confirmed without a real
inbound call, which needs someone to dial the number.

So direction is resolved in two steps:

1. Read the provider's direction field if present.
2. **Fallback that cannot be wrong:** if a lead exists whose `conversationId`
   matches this call, it was outbound; otherwise it was inbound.

Step 2 holds regardless of what the provider names things, so a field rename on
their side degrades the record's precision without corrupting it.

## Search

MongoDB `$text` over `transcript.message`, `summary` and `name`. One index,
stemmed and ranked, so "pricing" also finds "priced" and "prices".

**Known limitation, accepted:** `$text` matches whole words, not substrings —
`pric` will not find `pricing`. This is how people search conversations in
practice ("Shopify", "refund", "pricing"), and the alternative, an unanchored
regex scan, cannot use an index and degrades as the archive grows.

**Digit-only queries bypass `$text`** and match `counterpartyKey` by prefix
instead. Text tokenisation handles phone numbers badly, and "find that number"
is the second most likely search after "find that word".

Results are ranked by text score, then recency.

## Components

### `lib/call-store.ts`

Framework-free, like the other stores.

- `insertCallIfNew(input): Promise<Call | null>` — `null` on a duplicate
  `conversationId`. Both write paths call this; neither needs to check first.
- `listCalls({ direction?, query?, leadId?, limit? }): Promise<Call[]>`
- `getCall(id)`, `getCallByConversationId(conversationId)`

### `lib/lead-store.ts` — additions

- `findOrCreateLeadByPhone(input): Promise<{ lead: Lead; created: boolean }>` —
  the insert races two callers on the unique `phoneKey`; the loser catches
  `11000` and re-reads rather than checking first.
- `setLeadStage(id, stage)`, `setLeadFollowUp(id, date | null)`,
  `appendLeadNote(id, { body, author })`
- `advanceStageOnContact(id)` — `new` → `contacted`, no-op otherwise
- `needsAttentionCount()` — replaces `attentionLeadCount()`; see the badge below

### `lib/call-payload.ts`

Pure parsing of a provider conversation object into a `Call` input. No network,
no database — separated from the HTTP client precisely so it can be tested by
handing it a literal payload. Written defensively: a missing summary costs the
summary, not the transcript.

### `lib/elevenlabs.ts` — additions

- `listConversations({ pageSize })`
- `getConversation(id)`

Same contract as `placeCall`: never throws, every failure returns a reason.

### `lib/call-sync.ts`

`syncCalls()` — lists recent conversations, fetches the detail for any whose
`conversationId` is not already stored, inserts them with `source: "sync"`.
Bounded at one page (50) per run. Records `lastRunAt` and `lastError` in
`siteSettings` under a fixed `_id`, mirroring `getSyncState` in `imap-sync.ts`.

### `scripts/backfill-leads.ts`

One-off, run via `node --experimental-strip-types` like the existing seeds. Sets
`phoneKey` from `phone`, `stage: "new"`, `followUpAt: null`, `notes: []` on any
lead missing them. Idempotent — safe to run twice.

### Routes

| route | auth | purpose |
|---|---|---|
| `POST /api/calls/webhook` | HMAC signature | post-call webhook, both directions |
| `POST /api/lead/callback` | HMAC signature | **deprecated alias**, see below |
| `GET`/`POST /api/cron/call-sync` | `CRON_SECRET` bearer | scheduled reconciliation |
| `POST /api/admin/calls/sync` | admin session | the Refresh button |
| `GET /api/admin/calls?direction=&q=&lead=&conversation=` | admin session | list, search, or one call |
| `PATCH /api/admin/leads/[id]` | admin session | stage, follow-up date |
| `POST /api/admin/leads/[id]/notes` | admin session | append a note |
| `POST /api/admin/leads/[id]/call` | admin session | **exists** — now surfaced on Calls too |

**The rename and the alias.** `/api/lead/callback` is the wrong name once the
endpoint handles inbound calls that have no lead behind them. It becomes
`/api/calls/webhook`.

The old path is kept as a thin delegating alias that logs a warning naming the
new URL. This is deliberate: the provider's webhook URL lives in their
dashboard, not in this repo, and deploying a rename without updating it there
would silently drop every call until someone noticed — the exact opposite of
the goal. The alias is removed once the dashboard is confirmed updated.

### Admin panel

Sidebar: **Dashboard · Leads · Calls · Inbox** · Site content · Account.

**Leads** — the working surface.
- Filters: All / Needs you / By stage
- Row: name, number, stage pill, follow-up date when set
- Detail: contact fields, stage selector, follow-up date picker, notes
  (append-only, newest first), then this person's calls with transcripts inline
- "Call now" / "Call again" as today

**Calls** (`components/ui/admin-calls.tsx`) — the archive.
- Search box, plus All / Inbound / Outbound
- Refresh button running the sync, reporting last run and last error the way the
  Inbox reports IMAP
- Row: direction icon, name or number, time, duration
- Detail: who, direction, when, duration; summary when present; the full
  transcript as alternating turns with speaker labels and elapsed time; a link
  to the lead; a call-back button. Empty transcript says so plainly.

**The badge changes meaning.** Today it counts leads never successfully called.
It becomes **needs you**: never successfully called **or** `followUpAt` is in
the past, excluding `won` and `lost`. One number, one queue, one click. Calls
gets no badge — "unread" is not a concept that applies to an archive.

All panels keep the Inbox's visual language. Panels that behave identically are
easier to learn than panels that each have their own ideas.

## Configuration

No new environment variables. `CRON_SECRET` already exists and already gates
`inbox-sync`; the same secret gates `call-sync`.

Two things the operator must do outside this repo:

1. **Attach the agent to the number for inbound calls** in the ElevenLabs
   dashboard. Nothing here can do it.
2. Point the post-call webhook at `/api/calls/webhook`.

A **separate inbound agent** is recommended but out of scope — "Thanks for
calling BlueX" is a different opening from "Hi Sarah, you asked us to call", and
that is prompt configuration, not code.

Suggested cron, alongside the existing mail one:

```
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://bluex.agency/api/cron/call-sync
```

## Testing

Forged payloads, since a real inbound call cannot be placed from the developer's
location:

1. Signed inbound payload, unknown number → lead created with
   `source: "inbound"`, call stored `direction: "inbound"` and linked to it.
2. Signed inbound payload, **number already known** → no second lead; the call
   attaches to the existing one.
3. Signed outbound payload matching a lead's `conversationId` → stored
   `direction: "outbound"`, lead marked `completed`.
4. **The same payload delivered twice → exactly one call row.** This is the
   idempotency guarantee the whole reliability design rests on, and it is the
   most important test here.
5. A lead at `new` receiving a completed call → `contacted`. A lead at
   `qualified` receiving one → still `qualified`.
6. Search: a word in a transcript returns that call; a digit string returns
   calls by number; a word matching nothing returns empty, not everything.
7. Unsigned or wrongly-signed webhook → `401`, nothing written.
8. `/api/cron/call-sync` without a bearer → `401`. With `CRON_SECRET` unset →
   `401` regardless.
9. The deprecated alias still records a call and logs its warning.
10. `scripts/backfill-leads.ts` run twice changes nothing the second time.
11. The existing lead-flow checks still pass: valid submit `200`, bad input
    `422`, third submit `429`, unauthenticated admin routes `401`.

## Risks and unknowns

- **Provider field names are unverified** for the direction metadata and the
  conversations list response. Mitigated by the `conversationId` fallback and by
  defensive parsing throughout. Expect to correct field names against a real
  payload once one arrives.
- **No real inbound call can be tested** from the developer's location. The
  first genuine inbound test requires someone to dial the number.
- **List API pagination and rate limits are unknown.** The sync is bounded to
  one page per run, which is conservative; if call volume ever exceeds that
  between runs, the bound needs revisiting.
- **`phoneKey` uniqueness assumes one human per number.** A shared office line
  would collapse two people into one lead. Acceptable for this business; worth
  remembering before anyone reports it as a bug.
