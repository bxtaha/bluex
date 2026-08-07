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
| `components/motion/` | reveal primitives — `Reveal`, `SplitText`, `Marquee` |
| `components/providers/` | context + Lenis/GSAP wiring |
| `lib/` | `gsap.ts`, `lenis.ts`, `reveal.ts`, `utils.ts` (`cn`) |

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

- **`HERMES_WEBHOOK_URL` is not set.** `app/api/lead/route.ts` validates and
  returns `{ ok, dispatched:false }` without it; the UI copy degrades honestly,
  but no call is placed. This is the only thing between the site and a working
  lead flow.
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
