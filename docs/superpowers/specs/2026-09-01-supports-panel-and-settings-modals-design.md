# Supports panel, and settings that live where they apply

Two changes to the admin area, independent of each other and shippable
separately:

1. **Settings move into the panels they configure.** Inbound Calls, Outbound
   Calls and the new Supports panel each get a gear button that opens a modal
   holding that channel's settings. The Settings page keeps only what is
   genuinely shared or personal.
2. **A Supports panel**, listing the browser voice conversations, with the
   visitor's approximate location.

Approved 2026-09-01.

## Why settings move

`admin-voice-settings.tsx` is one form, with one Save button, covering three
things that have nothing to do with each other: which agent answers an inbound
call, which agent and number place an outbound one, and the workspace
credentials both share. Saving a change to the inbound agent currently
re-submits the outbound fields too.

More to the point, the settings are nowhere near the thing they configure. To
change which agent answers inbound calls you leave the Inbound Calls panel,
open Settings, and find the right card among three.

So each panel owns its own configuration.

| Panel | Gear opens | Fields |
|---|---|---|
| Inbound Calls | Inbound settings | `inboundAgentId`, `inboundPhoneNumberId` |
| Outbound Calls | Outbound settings | `outboundAgentId`, `outboundPhoneNumberId`, `outboundCallTransport` |
| Supports | Support voice settings | the ten support fields |
| Settings page (keeps) | — | API key, webhook secret, change password |

**The API needs no change.** `PATCH /api/admin/voice-settings` already applies
partial patches — it reads only the keys present in the body and leaves the
rest alone — so each modal sends its own fields and nothing else. That was
built for the secret-handling case and it happens to be exactly what this
needs.

**The API key and webhook secret stay on the Settings page** rather than being
copied into three modals. They are workspace-level in the provider's own model:
one key dispatches for every agent, one webhook URL receives every channel
signed with one secret. `lib/voice-settings.ts` already argues at length that
splitting them by direction would invent a distinction the provider does not
have, and splitting them by panel would be the same mistake wearing different
clothes.

### The modal itself

A new `AdminModal` in `components/ui/admin/`. Neither existing dialog fits:
`confirm-dialog.tsx` is shaped around a yes/no with a destructive-action tone,
and `components/ui/modal.tsx` belongs to the marketing site and carries a
pre-existing `react-hooks/set-state-in-effect` error that this work is not
going to inherit.

It sits at **z-index 75**: above the admin toast layer at 70, because a
settings modal must cover a toast rather than the reverse, and below
`confirm-dialog` at 80, because a confirmation opened *from inside* a settings
modal has to cover the modal that opened it. Giving both 80 would leave that
pair ordered by DOM position, which is how a confirmation ends up rendering
behind the thing it is confirming.

`AdminSectionHeader` already takes an `action` slot, so the gear button needs
no changes to the primitives.

## Supports panel

A sidebar row beneath Outbound Calls, plus a `VIEWS` entry.

The panel is `AdminCalls` with its `direction` prop generalised to one
discriminated scope, so a caller states exactly one thing and cannot ask for a
contradiction:

```ts
type CallScope =
  | { kind: "direction"; direction: CallDirection }  // Inbound / Outbound
  | { kind: "channel"; channel: CallChannel };       // Supports
```

`GET /api/admin/calls` already accepts `?channel=web`; that parameter was added
when the channel field was, and this is its first caller.

It shows what the Calls panel shows — transcript, duration, summary, the
agent's collected fields — plus a location column.

**Phone calls are untouched.** They keep Inbound and Outbound. Merging all
three into one panel with a filter was considered and rejected: the split is
what makes each channel's volume visible without opening anything.

## Location

### Where the address comes from, and where it goes

A browser conversation is filed by a webhook from the provider's servers, which
carries no visitor address. The only moment this application sees the visitor
is when their browser asks for a session.

`include_conversation_id=true` on the signed-URL endpoint returns the
conversation id alongside the URL, which gives the two halves a key to be
joined by. It also makes the signature single-use, which is a small security
improvement taken for free.

```
/api/voice/session
    ├─ reads the address from the request           (already does, for rate limiting)
    ├─ resolves it to a place, in-process, ~1ms
    ├─ discards the address
    └─ writes { _id: conversationId, country, region, city } to `voiceSessions`

/api/calls/webhook → call-intake
    └─ joins on conversationId, writes the place onto the call
```

### The address is never stored

Only `country`, `region` and `city` are written, and only after the address has
been used and dropped inside the same request. Nothing in `voiceSessions` or in
the `calls` collection can be resolved back to a person's connection.

Field shapes, so the UI and the store agree: `country` is an ISO 3166-1 alpha-2
code (`"BD"`), `region` is the subdivision **code** rather than its name
(`"C"`, not `"Dhaka Division"`) because that is what the dataset returns, and
`city` is a name that is frequently empty. The panel renders whatever subset is
present and falls back to "Unknown" when all three are — it must not print a
stray comma for a city the dataset did not know.

This is deliberate and it preserves an existing decision rather than reversing
one. `lib/client-ip.ts` hashes addresses precisely because "an IP address is
personal data, and a plain column of them in a marketing site's database is a
liability with no matching benefit". Storing coarse location while discarding
the address is the same trade, taken again: keep what is useful, drop what
identifies.

A first draft of this feature stored the address as well. It does not, and the
comment in `client-ip.ts` therefore remains true and needs no amendment.

### The lookup

`geoip-lite`, Apache-2.0, which bundles the MaxMind dataset. In-process, no
network call, and no third party ever sees a visitor's address — which matters
on a site whose CSP comment correctly states that it loads nothing from anyone
else.

The alternative, `maxmind`, is a 24KB reader that expects the caller to hold a
MaxMind account, a licence key and a refresh job. It was rejected because this
project has no secret-management story to hang a licence key on, and inventing
one in order to display city names is disproportionate.

The cost is real and worth stating: **`geoip-lite` is roughly 115MB unpacked**,
in `node_modules` and in the image. It is server-only and never reaches a
browser bundle.

### Failure is never fatal

A private address (localhost in development), an unroutable one, or a lookup
miss stores nothing and the panel shows "Unknown". Geolocation sits in the path
between a click and a conversation, and nothing in that path may be able to
stop a visitor talking to us. Every failure is caught and logged.

### Retention

The `voiceSessions` join record carries a **7-day TTL** — long enough that the
reconciliation cron can still attach a location to a call it recovers late,
short enough that unmatched records do not accumulate. Once joined, the
location lives on the call record for as long as the call does.

The TTL is garbage collection, not a privacy control. There is nothing
identifying in the record to expire.

## The trap this will spring if ignored

**`output: "standalone"` traces JavaScript imports, not files opened at
runtime by path.** `geoip-lite` reads its `.dat` files that way, so a
standalone build can omit them entirely — and the failure appears only in the
container, never in development, as lookups that silently return nothing.

`outputFileTracingIncludes` must name those files, and the result must be
checked against a real standalone build rather than assumed.

## Order of work

Two chunks, shippable independently:

1. **Settings into modals.** No new dependency, no new data, no privacy
   surface. Ships on its own.
2. **Supports panel and location.** Depends on nothing in the first chunk
   except the gear modal, which the first chunk builds.

## Verification

`npm test` covers pure logic only, and that stays true. The testable pieces
here are the geo lookup's normalisation (private address in, nothing out;
known address in, expected shape out) and the scope resolution for the calls
panel. Anything touching Mongo or HTTP is checked with curl against a running
server, as everything else in this repo is.

The browser-side work — the modal opening, the gear button, the panel
rendering — cannot be verified from this machine: React does not hydrate in
the agent's in-app browser in development. Those go back to the user as a
short list, the same way the voice widget's checks did.
