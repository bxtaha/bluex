# Customer Support voice — browser-based conversation

A visitor clicks a button in the corner of the public site and talks to the
ElevenLabs agent through their microphone. No phone call, no dialling, no
waiting for a callback.

This is a **third channel**, beside the two that already exist: the outbound
call the lead form triggers, and the inbound call someone places to the
published number. Nothing in the outbound flow changes.

Approved 2026-08-31. Written after probing the SDK rather than reading its
documentation — several of the obvious readings were wrong, and the ones that
mattered are recorded below so nobody has to re-derive them.

## What the SDK can actually do

Read from the shipped type definitions of `@elevenlabs/react@1.15.0` and
`@elevenlabs/client@1.23.0`, not from the docs.

`useConversation()` returns everything the design needs:

| Need | Call |
|---|---|
| Visitor's microphone level | `getInputVolume()` |
| Agent's output level | `getOutputVolume()` |
| Per-band spectrum, both directions | `getInputByteFrequencyData()` / `getOutputByteFrequencyData()` — `Uint8Array`, 100–8000 Hz |
| Who has the floor | `mode: "speaking" \| "listening"`, `isSpeaking`, `isListening` |
| Connection state | `status: "disconnected" \| "connecting" \| "connected" \| "error"`, plus `message` |
| Mute, end, session id | `isMuted` / `setMuted`, `endSession`, `getId()` |
| Lifecycle | `onConnect({conversationId})`, `onDisconnect(details)`, `onError(message, context)` |

**The level getters are pull functions, not reactive state.** They are read from
one `requestAnimationFrame` loop, never from render. That is not a workaround —
it is what keeps the animation off the React render path entirely, so a
sixty-times-a-second waveform costs zero re-renders.

The animation is therefore driven by **real audio**, in both directions,
distinguishably. No synthetic motion anywhere.

### The one thing that is not available: live language detection

`conversation_initiation_metadata_event` carries `conversation_id` and two audio
formats. **There is no language field on it**, and no incoming event in the
whole union carries one. The `language_code` fields in `@elevenlabs/types` all
belong to Scribe, which is a different product — standalone speech-to-text, not
the agent.

`language` exists only as something *sent*: `overrides.agent.language`.

ElevenLabs does have a `language_detection` system tool that switches language
mid-conversation, but it is off by default and enabled in their dashboard. When
it is on, the switch reaches the browser only as a generic agent tool call, via
`onAgentToolRequest`. That is what the indicator reads.

**Consequence, and it is deliberate: the language indicator stays hidden until
that tool actually fires.** Showing the language we *requested* would be a label
that looks like detection and isn't. Showing nothing is the honest state, and it
is also the correct state until someone enables the tool.

### Why the SDK is loaded on click and not before

`@elevenlabs/client`'s entry point statically re-exports `WebRTCConnection`,
which imports `livekit-client`. Choosing `connectionType: "websocket"` does not
remove it; the import is not conditional. `livekit-client@2.22.1`'s ESM bundle
is **~299 KB gzipped**.

This repo's largest recorded LCP win was deleting a 3 KB GSAP plugin that was
registered and never called, worth ~600 ms of main thread on a throttled phone.
Shipping 300 KB on every page load to make a button available is the same
mistake two orders of magnitude larger.

So the panel — and only the panel — is a dynamic import. See "Three gates".

The trade is that ~300 KB downloads between the click and the first audio. The
panel therefore opens **immediately**, into a real "Starting…" state, rather
than waiting for the chunk and looking broken.

## Three gates

Loading is gated three times, at three different layers, because "disabled"
has to mean *nothing loads* and not *nothing is visible*.

1. **Master toggle — server-side.** `app/(site)/layout.tsx` reads the settings
   and renders nothing at all when the feature is off. No element, no chunk, no
   agent id, nothing in the HTML. Verifiable with `curl`.
2. **Page visibility — client-side.** A layout cannot know the pathname, so a
   small component matches `usePathname()` against the stored rules using the
   pure matcher in `lib/support-voice-visibility.ts`.
3. **The SDK — on click.** `next/dynamic` with `ssr: false`. The chunk holding
   `@elevenlabs/react` is fetched when someone actually clicks the launcher.

**Cost of gate 2, stated rather than hidden:** on an excluded path the browser
downloads roughly 2 KB of our own code whose only job is to decide not to
render. The alternative is middleware, which routes every response on a
prerender-heavy site through a new hop to place one widget. That is the worse
trade. The 300 KB is unaffected either way — it is behind gate 3.

**The browser is never sent the agent id or the API key.** The client asks
`/api/voice/session` for a session; the server looks the agent up. The public
payload is label, placement, theme, mobile flag, path rules and the session cap
— nothing that is worth anything to somebody who reads it.

## Settings

Two files, the split every other setting here uses:

- **`lib/support-voice-store.ts`** — framework-free, so a script or a job can
  read it without a bundler. One document in `siteSettings`, `_id:
  "supportVoice"`. Server-side validation lives here: the agent id is trimmed
  and format-checked, the session cap is clamped, path lists are trimmed and
  deduped. The browser's validation is a convenience; this is the one that
  counts.
- **`lib/support-voice.ts`** — the Next-facing half. `unstable_cache` with a
  tag, and a `publishSupportVoice()` that calls **both** `revalidateTag` and
  `revalidatePath("/")`. `lib/contact.ts` documents why either alone looks like
  it works and does not. This is what makes "changes take effect without a
  redeploy" true.

**Every read spreads over defaults.** A cache entry is JSON written by whichever
version of the code stored it, so a field added later arrives `undefined` on an
old entry. That took the home page down once when `phone` was added to the
contact settings. Same trap, new settings object.

Fields, per the brief: enabled, agent id, button label, placement, page
visibility mode + list, greeting override, theme, mobile enabled, max session
minutes, log-to-inbox.

Two of those need their meaning fixed here, because each could reasonably be
read two ways:

- **Log conversations to Inbox** cannot prevent the webhook from arriving — the
  webhook URL lives in the ElevenLabs dashboard and fires for every channel. So
  the toggle governs *storage of web-channel conversations*: off means the
  handler acknowledges the delivery with a 200 and does not write a call
  record. It must return 200 rather than an error, or the provider retries
  forever something we are deliberately discarding. Phone conversations are
  never affected by this setting.
- **Theme** offers light / dark / follow site, but this site is dark only —
  there is no light mode to follow. "Follow site" therefore resolves to the
  site's own surface tokens (dark), and "light" is an explicit override for
  anyone embedding the panel against a pale background later. The default is
  follow.

### No new environment variables

The API key and webhook secret are workspace-level in the provider's own model
— one key dispatches for every agent, one webhook URL receives everything
signed with one secret. `lib/voice-settings.ts` already argues that splitting
them per *direction* would invent a distinction the provider does not have; the
same holds per *channel*. This feature resolves both through the existing
`resolveVoiceCredentials()`.

The support agent id is database-only with no environment fallback, exactly
like the inbound fields and for the same stated reason: it never existed
before, so there is no continuity to preserve.

`.env.example` and the README say this explicitly, rather than adding a
variable nothing reads.

## Session route

`POST /api/voice/session` — the single place the client asks for a session, so
that authentication can be tightened later without touching the client.

- **Origin allowlist**, derived from `NEXT_PUBLIC_SITE_URL`, the same source
  `next.config.ts` already uses for the canonical host.
- **IP rate limit** through the existing `rateLimit()` and `hashIp()`. It
  **fails open**, which is deliberate in `lib/rate-limit.ts` and is kept rather
  than made to fail closed here alone — one route with the opposite policy is a
  surprise, not a hardening.
- **Re-checks that the feature is enabled and configured.** The route does not
  trust that the client only appears where it should.
- Calls `getSignedUrl(agentId)`, added to `lib/elevenlabs.ts`. Additive, and the
  same never-throws `{ ok: false, reason }` shape as everything else in that
  file. `GET /v1/convai/conversation/get-signed-url?agent_id=…`, `xi-api-key`
  header, server side only.

A signed URL implies a WebSocket connection, which also **keeps the CSP change
small**: the WebSocket path talks only to `api.elevenlabs.io`, so LiveKit
contributes no hosts to `connect-src`. It is still bundled — that is an import
graph fact — but it never opens a connection.

## Header changes

The current configuration forbids this feature outright, on purpose. Two
headers change, narrowly:

```
Permissions-Policy: camera=(), microphone=(self), geolocation=(), browsing-topics=()
connect-src 'self' https://api.elevenlabs.io wss://api.elevenlabs.io
media-src  'self' blob:
worker-src 'self' blob:
```

`microphone=()` denies the microphone to every origin *including this one*, so
`getUserMedia` fails before a permission prompt is ever shown. `connect-src
'self'` blocks the WebSocket. `media-src` and `worker-src` are currently
unstated and fall back to `default-src 'self'`, which the SDK's AudioWorklet
path needs named.

**The `blob:` entries are confirmed against the built bundle, not assumed.** If
the worklet turns out to load from a file URL, they are dropped.

The comment block above those headers currently asserts that nothing in this
browser ever asks for a microphone, and that the policy is a promise a future
dependency cannot quietly break. This feature is that dependency. **The comment
is rewritten**, because a comment that contradicts the code beneath it is worse
than no comment.

## The animation

**There is no violet in this palette.** The tokens are `--color-electric`
`#2e6bff`, `--color-electric-glow` `#4d8bff`, and `--color-signal` `#f5f1e8`.
The two directions therefore read as **electric blue when the agent speaks,
signal cream when the visitor does** — a contrast the design language already
uses — rather than a violet invented for this component.

Seven bars, `transform: scaleY()` written directly from one rAF loop reading the
frequency data. Transform only: no layout, compositor-friendly, and seven style
writes a frame is nothing. Levels are smoothed with an asymmetric envelope —
fast attack, slow release — so the bars track speech instead of strobing.

Idle is a slow resting drift, not a frozen bar and not a nervous one.

**The loop runs only while the panel is open and the status is `connected`**,
and parks otherwise. `section-nav.tsx` established the pattern: a page at rest
costs nothing.

**Reduced motion needs its own gate here.** The blanket rule in the motion
safety block sets `animation-iteration-count: 1 !important`, which reaches CSS
animations — and this is a rAF loop, so it does not reach this. The component
checks the preference itself through `lib/use-media-query.ts` and swaps to a
static three-state indicator. Any CSS pulse added to the idle launcher must go
on the re-animated selector list beside `.bx-spinner`, or it freezes.

All component CSS goes in `app/globals.css` as named `.bx-*` classes. There are
no CSS modules and styled-jsx is not installed.

## Placement

The stack, as it actually is: `30` splash cursor, `40` scroll progress and
back-to-top, `41` nav dock, `50` site header, `54/55` blog chrome, `60`
`.bx-modal`. Admin-only above that: `70` toast, `80` confirm dialog.

The launcher sits at **45** — above the dock, below the header, well below the
modal layer.

**The corner is already occupied.** `.btt-root` is fixed bottom-right at the
same coordinates. The launcher takes the corner and back-to-top moves up by the
launcher's height plus a gap. Both clear `.scroll-progress` and
`env(safe-area-inset-bottom)`, which `.btt-root` already does.

The launcher is a real `<button>` with a visible focus ring, and collapses to
icon-only on small screens.

## States

Idle, requesting permission, permission denied, connecting, connected and
listening, agent speaking, muted, reconnecting, ended, errored. Each is a
distinct visible state; none is a spinner that can hang.

Permission denied and session failure both offer the contact form as a
fallback, through the existing `useLeadForm()` context. A dead button is never
an outcome.

## Teardown

- `pagehide` ends the session immediately.
- `visibilitychange` to hidden starts a **30 second grace period**, then ends
  it. Ending the instant somebody alt-tabs mid-sentence burns the conversation
  to save a few seconds of minutes; thirty seconds is long enough to check
  another tab and short enough that a forgotten session cannot idle for an hour.
- The configured max session length is a hard cap.
- The rAF loop stops with the panel, so a closed panel runs nothing.

## Inbox integration

Both channels post to the existing `/api/calls/webhook`: one URL, one secret,
one signature check. Idempotency needs no new work — the unique index on
`conversationId` already means a replayed delivery collides and
`insertCallIfNew` returns null.

**A new `channel: "phone" | "web"` field, not a third `direction` value.**
Direction is a telephony concept and "outbound" is meaningless for somebody who
clicked a button. A separate field is orthogonal, gives the source tag the brief
asks for, and leaves `callUsageStats`, `listCalls` and every existing direction
branch working untouched. A web conversation is `direction: "inbound"` — the
visitor came to us, which is what inbound means.

### The one shared file this touches

A browser conversation carries no `metadata.phone_call`, so today it would fall
through to the `hasLeadWithConversation` fallback in `lib/call-intake.ts` and be
filed as a phone call.

`parseConversation` gains a pure `hasPhoneCall` boolean. `resolveDirection`
gains one leading case for it. **Every existing branch stays byte-identical.**
This is a new case, not a refactor of the outbound path.

Structured fields the agent collected — name, email, phone, company, service
interest — come from `analysis.data_collection_results` and get a new pure
parser in `call-payload.ts`, unit tested like the rest of that file.

**When the agent collected a phone number, the conversation attaches to a lead**
through the existing `findOrCreateLeadByPhone`, because a lead is a person and
that is what the number identifies. When it did not, `leadId` stays `""` — the
same correct failure the withheld-number case already takes, rather than
inventing one anonymous person who absorbs everybody.

A failed write is logged, never dropped silently. The webhook already returns
5xx on a storage failure so the provider retries.

## Two dashboard-side dependencies

Neither is fixable from this repository. Both belong to the same family as the
inbound-attachment item already in `CLAUDE.md`.

1. **The greeting override does nothing unless it is allowlisted.**
   `overrides.agent.firstMessage` is silently ignored unless that specific
   override is enabled on the agent in the ElevenLabs dashboard. The Settings
   copy says so, the way the inbound card does, rather than implying a Save
   button reaches into another product.
2. **The language indicator needs the `language_detection` system tool enabled**
   on the agent. Until it is, the indicator stays hidden — which is the intended
   behaviour, not a failure.

## Verification

`npm test` covers pure logic only — no Mongo, no HTTP — and that stays true.
New tests: path matching in `tests/support-voice-visibility.test.ts`, and web
conversation parsing, `hasPhoneCall`, and data collection added to
`tests/call-payload.test.ts`. Routes are checked with curl against a running dev
server, as everything else here is.

**What cannot be verified from this machine, stated up front.** React does not
hydrate in the agent's in-app browser — its CSP blocks `eval()`, which the
development bootstrap needs — and there is no microphone. So real microphone
input, the reduced-motion fallback, the permission-denied path and the
teardown-on-background behaviour are checked by a person in a real browser.
Everything else — the disabled page containing no SDK, path visibility, the
z-index stack, the session route leaking no key, a bad webhook signature
refused, a replayed webhook storing once, and tsc/lint/tests/build — is checked
here and its output shown.

Claiming ten passing checks when four of them cannot run here would be the one
failure this document exists to prevent.
