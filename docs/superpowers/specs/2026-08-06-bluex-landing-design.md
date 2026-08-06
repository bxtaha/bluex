# BlueX Landing Page — Design

**Date:** 2026-08-06
**Status:** Approved

## Goal

A premium dark landing page for BlueX, a web + AI-automation studio serving the
Gulf, Canada and Australia. The site is itself the sales argument: if it feels
engineered, the client believes BlueX can engineer for them.

Two offers carry the page:

1. **AI Voice Automation** — a lead is called and booked within five minutes.
2. **Custom websites / e-commerce** — bespoke, fast, conversion-focused.

## Scope

This pass builds the spine the brief recommends, not all eleven sections:

- Hero
- Services (pinned horizontal scroll) — the showpiece
- How the AI agent works
- Final CTA
- Footer

Trust marquee, speed hook, "experience it" widget, Why BlueX, Process and
Results are deferred. They are additive and none of them change the
architecture below.

### Retired

The existing page is a single non-scrolling viewport built around a demo. These
go:

- `bell-notify` — maps to no section in the brief
- `animated-tab-bar` + `navbar` — a five-colour picker undercuts the positioning
- `stardust-button`, `copyright`, `button-github`
- `accent-provider` — with the picker gone it has one consumer and a constant
  value, so the indirection is dead weight

`kinetic-grid` is kept and retuned. It already provides the "subtle particle /
line motion" the brief asks for behind the hero, and it is perf-tuned.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0A0B0F` | page background |
| `--color-accent` | `#2E6BFF` | primary electric blue |
| `--color-accent-glow` | `#4D8BFF` | glows, hover states |
| `--color-signal` | `#F5F1E8` | warm off-white, primary CTA only |
| `--color-text` | `#F5F7FA` | primary text |
| `--color-muted` | `#8A909C` | secondary text |

Declared as Tailwind v4 `@theme` tokens in `app/globals.css`. `kinetic-grid`'s
`BG_COLOR` and `DEFAULT_ACCENT` constants move to match, and its cached
background buffer repaints on the change.

`--color-signal` is the brief's "warm contrast for CTAs". Reserving it for
primary actions only means the single most important button on each screen is
the only warm element on an otherwise blue page.

## Typography

Self-hosted via `next/font/local`, files in `public/fonts/`:

- **Display:** Clash Display 400/500/600/700
- **Body:** General Sans 400/500/600

Self-hosted rather than linked from the Fontshare CDN: one less external
round-trip and no third-party dependency on a site whose pitch is that it feels
fast. Geist is dropped.

## Architecture

```
app/layout.tsx              fonts, providers, scrolling document
app/page.tsx                section composition only
app/api/lead/route.ts       validates input, TODO for the Hermes webhook
components/providers/smooth-scroll.tsx
components/sections/        hero · services · how-it-works · final-cta · footer
components/ui/              kinetic-grid · magnetic · custom-cursor ·
                            reveal-text · lead-form
lib/gsap.ts                 single plugin-registration point
```

`layout.tsx` returns to a normal scrolling document; the current `h-dvh` flex
shell is removed.

## Motion

GSAP 3.15 (ScrollTrigger and SplitText, both free as of 3.13) and Lenis 1.3.

### Lenis ↔ ScrollTrigger

Both libraries want to own scroll, and drift unless driven from one clock:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

Registered once in `lib/gsap.ts`.

### Canvas lifecycle

`kinetic-grid` currently runs its RAF loop unconditionally. On a long scrolling
page that burns CPU for the whole document and competes with the pinned section
for the main thread precisely when smoothness matters. The loop is gated behind
an `IntersectionObserver` on the hero and stops once the hero leaves the
viewport.

### Horizontal scroll

Pinning and scrubbing horizontal translation is hostile on touch — it fights
native scroll. `gsap.matchMedia()` runs two branches over the same markup:

- `min-width: 768px` — pinned section, `x` scrubbed against scroll distance
- below that — flex carousel with CSS scroll-snap, no pin

Track distance is `track.scrollWidth - window.innerWidth`, recomputed via
`ScrollTrigger.refresh()` on resize.

### Reduced motion

Every timeline is created inside `gsap.matchMedia()` with a
`prefers-reduced-motion: reduce` branch that renders final states immediately.
A motion-maximalist page without this is unusable for some visitors, and it is
far cheaper to build in than to retrofit.

The custom cursor mounts only under `pointer: fine` and is never created on
touch devices.

## Lead form

`components/ui/lead-form.tsx` — a dialog opened by the hero and final CTAs.
Fields: name, business, phone (required), email.

`app/api/lead/route.ts` validates the payload server-side and returns typed
success/error. It contains a single clearly-marked `TODO` where the Hermes
webhook URL goes; the moment that URL is pasted in the flow works end to end
with nothing to rewire.

Client shows optimistic pending → success → error states. Validation lives in
one schema shared by client and route so the two cannot drift.

## Copy constraint

The brief's speed-hook section cites unsourced research on five-minute lead
response. The section is written so the claim is **structural** — delay costs
conversions — with **no fabricated statistic**. An invented figure on an
agency's own site is a liability. A specific number goes in only when a source
is supplied.

## Out of scope

- Real Hermes integration (endpoint not yet available)
- Case studies and client logos (none yet)
- CMS, blog, analytics
- The six deferred sections listed under Scope
