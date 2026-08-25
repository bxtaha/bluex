# BlueX landing page

Marketing site for an agency selling two things: custom websites/e-commerce, and
AI voice agents that call inbound leads within five minutes. Single page, dark,
motion-heavy. `main` is what ships.

**New here? `docs/overview.md` first.** It covers what the business is, the three
services it sells, the four route groups and where everything lives. This file
is the other half — the invariants and the traps, i.e. what will bite you once
you start changing things.

## Stack

Next 16.2.12 (App Router, Turbopack) · React 19.2.4 · Tailwind **v4** · TypeScript 5
GSAP 3.15 (ScrollTrigger only) · Lenis 1.3.26 · lucide-react · shadcn conventions

Tailwind v4 has **no config file**. Tokens live in `@theme inline` at the top of
`app/globals.css`.

## Where things go

| | |
|---|---|
| `components/sections/` | one file per page section, in `app/page.tsx` order |
| `components/ui/` | reusable pieces (shadcn alias target) |
| `components/ui/admin/` | admin chrome — card, table, button, field, states, dialog, toast |
| `components/motion/` | reveal primitives — `Reveal`, `SplitText`, `Marquee` |
| `components/providers/` | context + Lenis/GSAP wiring |
| `lib/` | `gsap.ts`, `lenis.ts`, `reveal.ts`, `utils.ts` (`cn`) |
| `tests/` | `node:test`, run with `npm test` — no framework, no new deps |

**All component CSS lives in `app/globals.css`.** styled-jsx is not installed and
there are no `.module.css` files. Tailwind utilities inline for layout; a named
`.bx-*` / `.nav-*` / `.site-header__*` class in globals.css for anything with
state, pseudo-elements or keyframes. ~4,100 lines and that is deliberate.

## Architecture worth knowing before you touch it

**One IntersectionObserver decides the current section.**
`components/providers/section-provider.tsx` owns it, plus the nav panel's open
state. The header pill and the right-edge dock both read it. Do not add a second
observer — two navigations disagreeing about where the reader is was a real bug.
Band is `rootMargin: -45% 0px -45% 0px`, so "active" means crossing the middle of
the viewport. Sections with no nav entry hold the last active item rather than
blanking.

**Scroll is Lenis's, not the browser's.** `lib/lenis.ts` holds the instance and
`HEADER_OFFSET = 96` (mirrored by `scroll-padding-top` in globals.css — change
both). Anything scrolling programmatically must go through `scrollToTop()` /
`scrollToSection()`; `window.scrollTo({behavior:'smooth'})` fights it. Lenis runs
off GSAP's ticker with `lagSmoothing(0)` so both share one clock.

**Reveals are CSS, not JS.** `lib/reveal.ts` is one shared observer that sets
`data-revealed`. Stagger travels as `--reveal-i` / `--word-i` / `--roll-i`
custom properties multiplied by a duration in CSS. Everything is gated behind
`@media (scripting: enabled)` so the page is readable with JS off.

**Glass is tokenised.** `--glass-*` (surface) and `--edge-lit-*` (the "you are
here" outline) in `:root`. The header pill and the side dock both read them, so
neither can be restyled alone. Offsets/directions are local to each component —
a pill under the top edge catches light differently from one on the right edge.

**A lead is a person; a call is a conversation.** `lib/lead-store.ts` keyed on a
unique `phoneKey` (digits only) so both intake paths — the form and an inbound
ring — find-or-create instead of insert: submit twice and you're one lead with
two calls. `lib/call-store.ts` holds every conversation in either direction,
transcript included; the lead itself carries no transcript anymore, just
`stage` (new/contacted/qualified/won/lost), `followUpAt`, and append-only
`notes`. **Two writers deliberately race to record a call** — the post-call
webhook (`/api/calls/webhook`) and the reconciliation cron
(`/api/cron/call-sync`) both call `lib/call-intake.ts`'s `recordConversation`,
and neither checks whether the other already got there. The unique index on
`conversationId` in `calls` is what makes that safe: the second insert collides
and `insertCallIfNew` returns null instead of throwing. Anyone who "fixes" that
by checking first will reintroduce the duplicates the index exists to prevent
— a check-then-insert is never atomic against a second writer doing the same
check. `lib/call-payload.ts` does the pure parsing (unit tested, no network);
`lib/call-intake.ts` is the single path both routes call afterward, which is
why a call the cron recovers hours late is stored identically to one the
webhook caught on time. A caller who withholds their number gets no lead —
the call is stored with `leadId: ""` rather than merging into one fictional
"anonymous" person. `app/api/lead/callback/route.ts` still exists as a
deprecated alias that logs a warning and delegates to the new handler; it
stays until the ElevenLabs dashboard is confirmed pointing at
`/api/calls/webhook`, because the webhook URL lives in their dashboard, not
this repo, and renaming the route without repointing it would silently drop
every call.

**Two principals, two collections, two cookies.** `lib/auth-core.ts` holds the
shared mechanics — token generation and hashing, lockout arithmetic, session
expiry, `DUMMY_HASH`. `lib/admin-auth.ts` reads `admin_users`/`admin_sessions`
behind `bx_admin`; `lib/client-auth.ts` reads `clients`/`client_sessions` behind
`bx_client`. **Do not merge these into one collection with a `role` field.** The
point is that a client's session token is *absent* from `admin_sessions`, so no
client cookie resolves to an administrator — not because a check rejects it, but
because the lookup cannot succeed. With roles, one guard that verifies the session
and forgets the role escalates any client to full admin. Escalation here needs two
independent bugs. Guards are `requireAdmin()` and `requireClient()`, deliberately
separate functions rather than one taking a role argument.

**Client status is re-checked on every request**, in `getClientSessionUser`, not
just at login. Checking at login only means deactivating a client leaves the
session they are currently holding working for up to eight hours. Deactivation
also revokes their sessions in the same call.

**Setup links are claimed with one conditional update**, not a read then a write —
that is what makes single-use true rather than likely under concurrency. The spent
digest moves to `setupTokenUsedHash`, which nothing authenticates against; it
exists only so a second visit reads "already used" instead of "no such link",
which matters because mail clients prefetch links and people double-click them.

**`createClient` relies on the unique index** rather than checking for an existing
email first, because a read-then-write loses the race where two admins add the
same address at once. The index is created on first use as well as by the seed
script — without it there is no duplicate-key error to catch and both inserts
succeed, which is a bug the test suite caught.

**The lead flow stores before it dials.** `/api/lead` limits, validates, writes
to the `leads` collection, *then* asks ElevenLabs to call — never the other way
round. A lead recorded but not called can be rung from the dashboard; a lead
called but not recorded is a conversation nobody can follow up. The dispatch is
awaited rather than deferred because the response's `dispatched` flag is what
the form's copy reads, and a guess there turns "your phone is about to ring"
into a hope. The post-call webhook matches a conversation back to its lead by
`conversationId` — the only handle the provider sends — and its signature check
is not optional: the endpoint is public and it writes transcripts. That handler
now lives at `/api/calls/webhook`; see the lead-is-a-person note above for why
`/api/lead/callback` still exists beside it.

**The voice agent's credentials are editable from Settings, not just
`.env.local`.** `lib/voice-settings.ts` holds them — one document in
`siteSettings`, the same shape as `contact-store.ts` — and every function in
`lib/elevenlabs.ts` calls `resolveVoiceCredentials()` fresh rather than reading
`process.env` directly, which is also why they're all `async` now even where
the HTTP call itself is not: a key saved from the dashboard has to take effect
on the next request, not the next deploy. **The database wins when both are
set; the environment variable is a fallback, not a value to delete** — it is
what a fresh deployment runs on before anyone opens Settings, and what a
credential rotation can still reach by redeploying if the dashboard is ever
unreachable. The two secrets (API key, webhook signing secret) never round-trip
to the browser in the clear — `readVoiceSettingsForAdmin` returns only whether
one is set and its last four characters, the same amount Stripe or GitHub shows
back for a token you've already saved — so the PATCH contract distinguishes
"field left blank, leave the stored value alone" (omit the key) from "clear the
override, fall back to the environment variable" (`null`) precisely so a blank
input can never silently wipe a working key.

**The dashboard's voice-usage card shows two talk-time numbers on purpose, and
cannot show the plan quota with the current key.** `getUsageMinutes` reads
ElevenLabs' own billable figure from `/v1/usage/character-stats` — badly named,
it is the generic usage series and takes `metric=minutes_used`, returning daily
buckets that have to be summed. `callUsageStats` in `call-store.ts` aggregates
what this archive actually holds. **They are not interchangeable and must not be
collapsed into one figure**: the provider's includes conversations the webhook
never delivered and the cron has not recovered, so a gap between the two is the
signal that calls are being missed — the failure that is otherwise invisible.
Measured live at the time of writing: 17.29 provider minutes against 1028
archived seconds (17.13), i.e. the archive is essentially complete.

The plan quota lives only at `/v1/user/subscription` (`tier`,
`character_count`, `character_limit`, `next_character_count_reset_unix`) and
**that endpoint needs the `user_read` permission, which this account's key does
not have** — it returns 401 `missing_permissions` while every `/v1/convai/*`
route and the usage series answer fine on the same key. Probed directly:
`/v1/user`, `/v1/user/subscription/extras`, `/v1/subscription` and
`/v1/workspace/subscription` are all 401 or 404, so there is no way around it
from code. A narrowly-scoped key is the better posture, so `getPlanUsage`
reports that 401 as its own `needsPermission` shape and the card names the
missing permission rather than rendering a progress bar full of zeros. Granting
`user_read` in the ElevenLabs dashboard is the only thing needed to light it up;
nothing else depends on it.

**Outbound and inbound have separate agent/number fields, because they are not
the same operation.** `outboundAgentId` and `outboundPhoneNumberId` are live
configuration — `placeCall` sends them to the provider, so saving one changes
what the next dispatched call does. `inboundAgentId` and `inboundPhoneNumberId`
are reference only: nothing this repo runs can attach an agent to a phone
number for inbound, that happens in the ElevenLabs dashboard under Agents →
Phone numbers, and the Settings copy says so rather than implying a Save
button reaches into another product. They exist so that fact — previously
tribal knowledge in this very file — has a visible home. `apiKey` and
`webhookSecret` are **not** split by direction: both are workspace-level in
the provider's own model, one key dispatches for every agent and one webhook
URL receives both directions signed with one secret, so splitting either would
invent a distinction the provider doesn't have. The inbound fields have no
environment-variable fallback — inbound was never configurable from this repo
before this feature existed, so there was nothing to preserve continuity with.

**The bell** (`scroll-bell.tsx` + `bell-notify.tsx`) scales from `--bell-size`,
not its `size` prop — `BellNotify` writes `font-size` inline, which no stylesheet
can beat without `!important`. Progress uses **one** formula over
`sectionHeight + viewportHeight`; it used to branch on whether the section was
taller than the viewport and popped when a URL bar collapsed across that line.

**Every credential form carries `method="post"`, and it is not decoration.**
`client-login-form`, `client-setup-form` and `admin-login-form` all submit
through an `onSubmit` handler that calls `preventDefault`, so the attribute
never fires in normal use. It exists for the case where it does: a form used
before hydration completes falls back to a *native* submit, and a form with no
`method` defaults to GET — which writes the password into the query string,
where it reaches browser history, the server access log and any outgoing
`Referer`. This was observed, not theorised: the agent's in-app browser never
hydrates (see Performance), and a login attempt there navigated to
`?email=...&password=...`. POST cannot put a body field in a URL, so the same
failure becomes a harmless 405.

**Progress indicators are exempt from the blanket reduced-motion rule.**
`.bx-spinner` (globals.css) is the site's spinner; the admin uses lucide's
`Loader2` with Tailwind's `.animate-spin`. The universal rule in the
motion-safety block sets `animation-iteration-count: 1 !important`, which for a
spinner means one 0.01ms rotation and then a motionless ring — indistinguishable
from a crashed request, which is the opposite of reassuring. Both selectors are
therefore re-animated in that same block as an opacity pulse: still "working",
without the rotation that the preference exists to remove. `.animate-spin` needs
it as much as `.bx-spinner` does, because Tailwind's utility carries no
`!important` and loses to the blanket rule outright — every `Loader2` in the
admin was silently frozen before this. If you add a new progress indicator, add
it to that selector list or it will freeze.

## Gotchas that cost real time

- **Never write `scrollbar-width`/`scrollbar-color` beside `::-webkit-scrollbar`.**
  Chrome drops the pseudo-elements entirely for any element carrying a non-`auto`
  value of either standard property — so the arrangement every snippet online
  suggests silently forfeits the custom scrollbar in Blink while looking correct
  in the source. The admin block at the end of globals.css keeps the standard
  path in an `@supports not selector(::-webkit-scrollbar)` fence that only
  Firefox enters. Also: `::-webkit-scrollbar-thumb` does not transition in Blink,
  so do not declare one.
- **Never write `-webkit-backdrop-filter`.** Chrome 150 rejects it outright, and
  Lightning CSS collapses an author-written pair keeping only the prefixed one —
  the element silently loses its blur. Write the standard property alone; the
  build emits both correctly.
- **State both overflow axes.** `overflow-y: auto` alone computes `overflow-x` to
  `auto`, which grew a phantom horizontal scrollbar in the nav panel: 15px of
  `offsetHeight` on desktop, 0 under mobile emulation. Use `overflow: hidden auto`.
- **`#services` needs `overflow-x: clip`** (not `hidden` — `hidden` would make it
  a scroll container and fight the pin). Without it the track's real width becomes
  document overflow and phones zoom the whole site out.
- **This repo's react-hooks lint is strict.** `set-state-in-effect`, `refs` and
  `immutability` all fire and all block the build. No `setState` in an effect
  body, no ref reads during render, no mutating a counter inside a render-time
  `.map`. Twice these errors pointed at a real design problem, not a style nit.
- **`inert` is typed `boolean`** in React 19, not `""`.
- Lenis anchor scrolling lands sections at roughly 2×`HEADER_OFFSET`. Pre-existing
  and identical for the header links — not a regression, still unexplained.

## Verifying work

Measure, don't assume. Every UI claim in this project's history was checked over
**Chrome DevTools Protocol** using Node 22's built-in `WebSocket` — no Puppeteer,
no dependency. Start Chrome with `--remote-debugging-port=9222`, then
`Emulation.setDeviceMetricsOverride` per viewport and `Runtime.evaluate` to read
real geometry. Screenshot as well as measure: the panel-with-no-background bug
and the wave-strobing-the-nav-pill bug were both invisible in the numbers.

Standard viewports: 375, 390, 412, 768, 1024, 1280, 1440, 1920 (+ landscape).

Two traps in that harness:

- **Headless Chrome has no window focus**, so `:focus` never matches even when
  `document.activeElement` is correct. Use `CSS.forcePseudoState`. A focus ring
  reading `outline: none` is probably this, not a bug.
- **`Input.dispatchMouseEvent` does not reliably trigger `:hover`.** Force the
  pseudo-state or set the styles directly.
- **Do not `pkill -f "next start"`** — it kills the agent's own shell (exit 144).
  Kill PIDs one at a time.

`npm test` runs Node's built-in test runner over pure logic only — payload
parsing, phone-key derivation, stage transitions, filter composition — nothing
that touches Mongo or HTTP. Anything that does (the webhook, the cron, the
admin routes) is verified with curl against a running dev server instead;
there is no mocked-database test suite here.

## Performance

Baseline after the audit: **median LCP 2500ms** (range 2440–2552) at 390×844,
4× CPU throttle, 1.6Mbps/150ms, five cold loads. Was 3028ms before.

Two lessons from that pass:
- Fonts are `display: swap`, so trimming them saves **bandwidth, not LCP**. The
  44KB cut moved nothing. The lever is JS execution.
- The largest single win was deleting `gsap/SplitText`, which was registered on
  every visit and never called — 3KB of transfer, ~600ms of main-thread time on a
  throttled phone. Check for that shape of waste before optimising anything else.

Measure a baseline by building the *previous commit*, not by trusting one sample.
Run counts of 5 minimum; a single "after" number was 600ms off the median once.

### The second pass: runtime cost, not load cost

The first pass bought LCP. The second went after what the page costs *while you
use it*, which is what "feels heavy on a cheap laptop" actually means. Four
patterns, worth recognising before adding anything new:

- **`backdrop-filter` is the most expensive thing on this page, per element.**
  `.bx-card` carried `blur(12px)` and renders 20-25 times on the homepage. Each
  one is its own backdrop root — snapshot, downsample, blur, upsample,
  composite — and none of it caches while the page scrolls, because the sampled
  region moves every frame. It is gone from `.bx-card` and `.bx-btn--ghost`;
  `.bx-card--frosted` is the opt-in, used on exactly one card (the one over the
  ParticleOrb canvas) and gated to pointer devices. **Do not put
  `backdrop-filter` on anything that repeats.** Over near-black under a
  translucent white gradient it is very nearly invisible anyway — the gradient
  and `.bx-hairline` are what read as glass.
- **An `infinite` CSS animation you cannot see still costs a composited layer
  and a tick.** LiquidButton had five per instance and renders six times
  including in the fixed header — thirty of them, all invisible until hover.
  They are `animation-play-state: paused` until `:hover`/`:focus-visible` now.
  The `#services` waveform (18 layers) and the bell (3, two under `blur()`)
  pause when their section is off screen.
- **Anything gated on an IntersectionObserver must fail *open*.** The pause
  rules match `[data-onscreen="false"]`, never `:not([data-onscreen])`. If the
  observer never delivers — JS off, a hydration error upstream, an engine that
  does not run it — an absent attribute has to mean "animate". Written the
  other way round the same failure freezes the waveform permanently, which is a
  worse bug than the cost being saved. The `onScreen` flag in `kinetic-grid.tsx`
  defaults to `true` for the same reason.
- **A rAF loop that redraws an unchanged picture is pure waste.** `ScrollProgress`
  re-armed unconditionally for the life of the page, and KineticGrid redrew
  ~1,100 canvas paths a frame at rest. Both now park themselves once settled and
  wake on input — the pattern `section-nav.tsx` already used ("a page at rest
  costs nothing"). `lib/scroll-extent.ts` exists because three of these loops
  each read `documentElement.scrollHeight` every frame, which forces a layout
  flush; it caches that number and invalidates it from a `ResizeObserver`.
  Anything that stops re-arming every frame must subscribe to `onExtentChange`,
  or it goes stale when the document grows.

KineticGrid also gained the reduced-motion and touch gates every other motion
system here already had — it is a canvas that chases a cursor, so on a phone it
was repainting the hero every frame to render something structurally invisible.

**None of the above was verified in a browser.** See the note in "Verifying
work": this machine cannot profile, and **React does not hydrate in the agent's
in-app browser at all** — its CSP blocks `eval()`, which React's development
bootstrap needs, so `Object.keys(formEl).filter(k => k.startsWith('__react'))`
comes back empty and no client component ever mounts. An earlier version of this
note blamed IntersectionObserver specifically; that was the symptom, not the
cause. Anything client-side checked there reports a false negative, so it proves
nothing either way. What *is* verifiable there: server-rendered HTML (`curl` the
route), the compiled CSS in `.next/static/chunks`, and the cascade, by injecting
rules and reading `getComputedStyle`. Static checks — tsc, lint, tests, build —
remain the real safety net.

## Open items

- **SEO has its own standing note: `docs/seo.md`.** What two audit passes fixed,
  what is left and in what order, and how each claim was measured. Read it before
  acting on any SEO finding — several of the obvious readings were wrong. The
  short version: on-page work is largely exhausted, and what remains is backlinks
  (7 links, 6 domains) and putting a CDN in front of a single-region origin.
- **Outbound calls currently fail at Twilio, not at ElevenLabs, and not in this
  repo.** Every outbound dispatch on record — three attempts, all to
  `+8613132740404` — comes back with
  `metadata.error.reason = "HTTP 401 error: Unable to create record: Primary
  compliance profile is not approved. Please refer to documentation and complete
  the KYC process in Trust Hub to gain access."` (`code: 1011`,
  `error_type: call_initialization_error`). Trust Hub and the Primary Customer
  Profile are Twilio's regulatory-compliance system; the fix is completing KYC in
  the **Twilio** console, and nothing in this codebase or in ElevenLabs will
  change it. **Note the failure shape**, because it is genuinely misleading:
  ElevenLabs returns HTTP 200, *does* create a conversation record, and only then
  hands off to Twilio and gets refused — so `placeCall` sees a success status
  with no `conversation_id` and the visitor sees "We couldn't start the call."
  The real reason exists only on the conversation, readable via
  `GET /v1/convai/conversations/{id}` → `metadata.error`. Every recorded outbound
  attempt went to the same +86 number, so whether this blocks all outbound or
  only international is **not** established — a test call to a domestic number
  would settle it.
- **A separate quota signal, seen once:** an inbound conversation on 2026-08-25
  terminated with `"This request exceeds your quota limit."` Unrelated to the
  Twilio failure above and not investigated further; the plan quota cannot be
  read from the API on this key (see the voice-usage note above).
- **Two things outstanding, both in the ElevenLabs dashboard, neither fixable
  from this repo.** (1) The post-call webhook still needs to be repointed at
  `/api/calls/webhook` — until that's confirmed, leave
  `app/api/lead/callback/` in place as the deprecated alias it is; deleting it
  first would silently drop every call. (2) The agent needs to be attached to
  the phone number **for inbound**, or a call placed to that number rings
  nothing — outbound dispatch works independently of this setting, which is
  why it's easy to miss. Settings now has an "Inbound calls" card to *record*
  which agent and number that attachment is supposed to be — see the
  outbound/inbound note above — but filling it in does not make the
  attachment, only writes down that it should exist.
- **The ElevenLabs keys *are* set** in `.env.local` — this entry previously said
  they were not, and that had drifted. `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
  and `ELEVENLABS_AGENT_PHONE_NUMBER_ID` all have values, so outbound dispatch is
  live. With them unset, leads are still stored and marked `not_configured` and
  the form returns `{ ok, dispatched:false }` — and the dashboard overview now
  says which of the two it is, rather than leaving it to be discovered from a
  customer. `ELEVENLABS_WEBHOOK_SECRET` is also set, without which the callback
  refuses every request. The old `HERMES_WEBHOOK_URL` is gone;
  `docker-compose.yml` still passes it.
- **There are already 10 real conversations in the `calls` collection**, inbound,
  including a 169-second/11-turn one. They were synced from the live account while
  the call-tracking feature was being built, which is why the Calls panel has data
  to show the moment it is deployed rather than an empty state.
- **SMTP and IMAP are configured**, so mail works — the client invitation flow
  uses `lib/mailer.ts` rather than adding a provider. Exercising invites sends
  real email.
- **`.env.example` had live Cloudinary credentials committed** (since `dc712cb`).
  They are blanked now, but **the key still needs rotating in the Cloudinary
  dashboard** — blanking stops it leaking again from a file people copy; it does
  not un-leak it. History was deliberately not rewritten: several remote branches
  share it, a rewrite breaks every clone, and rotation makes the history
  irrelevant anyway.
- **Pricing is researched but unpublished.** `docs/pricing.md` proposes figures
  and per-lead billing; `docs/competitors.md` has the market data with sources.
  Every tier still says "get a quote" and `priceRange` is still absent from the
  structured data. Publishing is a business decision.
- `metadataBase` is `https://bluex.agency`. Deploying elsewhere first will point
  OG images and canonicals at the wrong host.
- `app/faviconx.ico` (87KB) is tracked and unused — Next only serves
  `app/favicon.ico`. Removal offered, no answer yet.
- `bluex_v2` branch is well behind `main` and only kept as a reference for the
  bell's original lighting.
- 87 Dependabot advisories on the repo, all pre-existing.

## Working preferences

Push only when asked — the user says "push" explicitly each time. Commit messages
are prose explaining *why*, not bullet lists. Report what was measured, and say
plainly when something was not verified or turned out not to help.
