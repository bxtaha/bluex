# Call tracking — design

**Date:** 2026-08-22
**Status:** approved, not yet implemented

## The goal

Every conversation the voice agent has, in either direction, recorded and
readable as text in the admin panel.

Two services exist today in different states:

1. **Outbound** — someone asks for a call on the site, `/api/lead` stores the
   lead and dispatches. Working.
2. **Inbound** — someone dials the published number and the agent answers.
   Does not exist. Requires the agent to be attached to the number for inbound
   in the ElevenLabs dashboard.

The scope is deliberately narrow: **read only**. No transcript search, no
follow-up pipeline, no analytics. A faithful archive and a clean way to read it.

## The insight this rests on

The post-call webhook already receives inbound calls. `/api/lead/callback`
fires for every conversation, and when it cannot match one to a lead it logs
`no lead for conversation` and discards it. Inbound tracking is mostly a matter
of no longer throwing that data away.

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
  /** Our number that carried the call. */
  agentNumber: string;
  agentId: string;

  /** Set when this call came from a form dispatch. Empty for inbound. */
  leadId: string;
  /** Known for outbound (from the lead). Empty for inbound. */
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
| `{ leadId: 1 }` partial, non-empty | the Leads panel's lookup |

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

**Kept**, unchanged: everything else, including `conversationId`, which becomes
the join key to `calls`.

Migration cost is zero. The only two documents carrying the removed fields are
test rows created during development, and they are being deleted anyway. No
migration script.

## Determining direction

The payload is expected to carry phone metadata naming the direction, but the
exact field names are unverified — they cannot be confirmed without a real
inbound call, which needs someone to dial the number.

So direction is resolved in two steps:

1. Read the provider's direction field if present.
2. **Fallback that cannot be wrong:** if a lead exists with this
   `conversationId`, the call was outbound; otherwise it was inbound.

Step 2 holds regardless of what the provider names things, so a field rename on
their side degrades the record's precision without corrupting it.

## Components

### `lib/call-store.ts`

Framework-free, like the other stores.

- `insertCallIfNew(input): Promise<Call | null>` — returns `null` on a duplicate
  `conversationId`. Both write paths call this; neither needs to check first.
- `listCalls({ direction?, limit? }): Promise<Call[]>`
- `getCall(id): Promise<Call | null>`
- `getCallByConversationId(conversationId): Promise<Call | null>`

### `lib/call-payload.ts`

Pure parsing of a provider conversation object into a `Call` input. No network,
no database — separated from the HTTP client precisely so it can be tested by
handing it a literal payload.

Written defensively, matching the style already in `/api/lead/callback`: a
missing summary costs the summary, not the transcript.

### `lib/elevenlabs.ts` — additions

- `listConversations({ pageSize }): Promise<{ ok, conversations } | { ok: false, reason }>`
- `getConversation(id): Promise<...>`

Same contract as `placeCall`: never throws, every failure returns a reason
string.

### `lib/call-sync.ts`

`syncCalls()` — lists recent conversations, fetches the detail for any whose
`conversationId` is not already stored, inserts them with `source: "sync"`.
Bounded at one page (50) per run.

Records `lastRunAt` and `lastError` in the `siteSettings` collection under a
fixed `_id`, mirroring `getSyncState` in `imap-sync.ts`, so the panel can report
when reconciliation last ran and whether it failed.

### Routes

| route | auth | purpose |
|---|---|---|
| `POST /api/calls/webhook` | HMAC signature | the post-call webhook, both directions |
| `POST /api/lead/callback` | HMAC signature | **deprecated alias**, see below |
| `GET`/`POST /api/cron/call-sync` | `CRON_SECRET` bearer | scheduled reconciliation |
| `POST /api/admin/calls/sync` | admin session | the panel's Refresh button |
| `GET /api/admin/calls?direction=&conversation=` | admin session | the list, or one call by conversation id |

**The rename and the alias.** `/api/lead/callback` is the wrong name once the
endpoint handles inbound calls that have no lead. It becomes `/api/calls/webhook`.

The old path is kept as a thin delegating alias that logs a warning naming the
new URL. This is deliberate: the provider's webhook URL lives in their
dashboard, not in this repo, and deploying a rename without updating it would
silently drop every call until someone noticed — which directly contradicts the
goal. The alias is removed once the dashboard is confirmed updated.

### Admin panel

Sidebar: **Dashboard · Calls · Leads · Inbox** · Site content · Account.

**Calls** (`components/ui/admin-calls.tsx`)
- Filters: All / Inbound / Outbound
- Refresh button running the sync, reporting last run and last error the way the
  Inbox reports IMAP
- List row: direction icon, name or number, time, duration, direction pill
- Detail: header (who, direction, when, duration), summary block when present,
  then the full transcript as alternating turns with speaker labels and elapsed
  time. Empty transcript states so plainly.

No sidebar badge. "Unread" is not a concept that applies to an archive, and a
badge that only ever counts upward is noise.

**Leads** — unchanged in purpose. Its transcript section now fetches from
`/api/admin/calls?conversation=<id>` when a lead is opened, rather than reading
fields it no longer holds.

All three panels keep the Inbox's visual language. Three panels that behave
identically are easier to learn than three that each have their own ideas.

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

1. Signed inbound payload, no matching lead → stored, `direction: "inbound"`.
2. Signed outbound payload matching a lead's `conversationId` → stored,
   `direction: "outbound"`, `leadId` set, lead marked `completed`.
3. **The same payload delivered twice → exactly one row.** This is the
   idempotency guarantee the whole reliability design rests on and it is the
   most important test here.
4. Unsigned or wrongly-signed → `401`, nothing written.
5. `/api/cron/call-sync` without a bearer token → `401`. With `CRON_SECRET`
   unset → `401` regardless.
6. The deprecated alias still records a call and logs its warning.
7. The existing lead-flow checks still pass: valid submit `200`, bad input
   `422`, third submit `429`, unauthenticated admin routes `401`.

## Risks and unknowns

- **Provider field names are unverified** for the direction metadata and the
  conversations list response. Mitigated by the `leadId` fallback and by
  defensive parsing throughout. Expect to correct field names against a real
  payload once one arrives.
- **No real inbound call can be tested** from the developer's location. The
  first genuine inbound test requires someone to dial the number.
- **List API pagination and rate limits are unknown.** The sync is bounded to
  one page per run, which is conservative; if call volume ever exceeds that
  between runs, the bound needs revisiting.
- Mainland China numbers remain unreachable outbound — unchanged by this work,
  and it does not affect inbound.
