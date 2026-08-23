# BlueX landing page

Marketing site for an agency selling two things: custom websites/e-commerce, and
AI voice agents that call inbound leads within five minutes. Single page, dark,
motion-heavy. `main` is what ships.

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
state, pseudo-elements or keyframes. ~2,200 lines and that is deliberate.

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
into a hope. `/api/lead/callback` matches the post-call webhook back to the lead
by `conversationId` — the only handle the provider sends — and its signature
check is not optional: the endpoint is public and it writes transcripts.

**The bell** (`scroll-bell.tsx` + `bell-notify.tsx`) scales from `--bell-size`,
not its `size` prop — `BellNotify` writes `font-size` inline, which no stylesheet
can beat without `!important`. Progress uses **one** formula over
`sectionHeight + viewportHeight`; it used to branch on whether the section was
taller than the viewport and popped when a URL bar collapsed across that line.

## Gotchas that cost real time

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

## Open items

- **SEO has its own standing note: `docs/seo.md`.** What two audit passes fixed,
  what is left and in what order, and how each claim was measured. Read it before
  acting on any SEO finding — several of the obvious readings were wrong. The
  short version: on-page work is largely exhausted, and what remains is backlinks
  (7 links, 6 domains) and putting a CDN in front of a single-region origin.
- **The ElevenLabs keys are now set** in `.env.local` (this entry previously said
  they were not — it had drifted). The lead flow is wired end to end: `/api/lead`
  stores every submission in the `leads` collection and dispatches a call,
  `/api/lead/callback` records the transcript, and the Leads panel in `/admin`
  shows both. With the keys unset, leads are still stored and marked
  `not_configured`, the form returns `{ ok, dispatched:false }`, and the dashboard
  overview now says so explicitly rather than leaving it to be discovered from a
  customer. Also needs `ELEVENLABS_WEBHOOK_SECRET`, or the callback refuses every
  request. The old `HERMES_WEBHOOK_URL` is gone; `docker-compose.yml` still passes
  it.
- **SMTP and IMAP are configured**, so mail works — the client invitation flow
  uses `lib/mailer.ts` rather than adding a provider. Exercising invites sends
  real email.
- **`.env.example` had live Cloudinary credentials committed** (since `dc712cb`).
  They are blanked now, but **the key still needs rotating in the Cloudinary
  dashboard** — blanking stops it leaking again from a file people copy; it does
  not un-leak it. History was deliberately not rewritten: five remote branches
  share it, a rewrite breaks every clone, and rotation makes the history
  irrelevant anyway.
- **Client portal pricing is researched but unpublished.** `docs/pricing.md`
  proposes figures and per-lead billing; `docs/competitors.md` has the market
  data with sources. Every tier still says "get a quote" and `priceRange` is still
  absent from the structured data. Publishing is a business decision.
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
