# BlueX — what this project is

A companion to `CLAUDE.md`. That file explains *how to work on this codebase* —
the invariants, the traps, the decisions that look wrong until you know why.
This one explains *what the thing is*: the business it serves, the services it
sells, and where each of those lives in the tree.

Read this first if you are new. Read `CLAUDE.md` before you change anything.

---

## The goal

BlueX is an agency. This repository is two products in one deployment:

1. **The marketing site** — a single-page, dark, motion-heavy pitch at
   `bluex.agency` whose entire job is to convert a visitor into a phone number.
2. **The machine behind it** — an admin dashboard and a set of API routes that
   take that phone number, ring it within five minutes, record the
   conversation, and keep the whole history somewhere a human can act on it.

The site is the shop window. Everything under `app/api/` and `app/(admin)/` is
the shop.

The organising claim of the business — and the reason the code is shaped the
way it is — is **speed to lead**. A lead answered in five minutes is worth
many times one answered tomorrow. So the lead pipeline is built to never lose a
call: leads are stored *before* the dial is attempted, two independent writers
race to record every conversation, and a call the reconciliation cron recovers
hours late is stored identically to one the webhook caught on time.

---

## The services sold

Three, defined in `components/sections/services.tsx` and framed as one offer in
two directions plus the thing they plug into.

| # | Service | The pitch |
|---|---|---|
| 01 | **Outbound: Speed to Lead** | A lead fills in the form and the phone rings before they have closed the tab. Qualifies against the client's own criteria, books into their calendar, hands back the transcript and outcome. |
| 02 | **Inbound: Call Answering** | Answers every call including evenings and weekends. Books appointments, handles routine questions, records and transcribes everything. |
| 03 | **Custom Websites & E-commerce** | Built from scratch around how the client actually sells — no templates, no page builders. Storefronts wired to real payments, structured so the voice agent plugs straight in. |

Pricing is **researched but unpublished**. `docs/pricing.md` proposes figures and
per-lead billing, `docs/competitors.md` holds the market data with sources, and
every tier on the live site still says "get a quote". Publishing is a business
decision, not a code change.

---

## The three audiences, and the three front doors

The app router is split by who is looking at it. Each group has its own layout,
because they share almost nothing — the marketing site has Lenis, a cursor and a
section dock; the admin has none of that and a different palette entirely.

```
app/
├── (site)/          the marketing page          → public
├── (blog)/          posts, RSS, OG images       → public
├── (admin)/         the dashboard               → bx_admin cookie
├── (clients)/       the client portal           → bx_client cookie
└── api/             everything above talks to this
```

### `(site)` — the marketing page

One route, `app/(site)/page.tsx`, composed of fifteen sections rendered in this
order. `components/sections/` holds one file per section, in the same order.

`Hero` → `TrustStrip` → `SpeedHook` → `Services` → `HowItWorks` →
`ExperienceIt` → `Process` → `Outcomes` → `WhyBluex` → `Portfolio` →
`Pricing` → `BlogTeaser` → `Contact` → `FinalCta` → `SiteFooter`

Most of that content is editable from the admin rather than hardcoded — pricing
tiers, portfolio projects, contact details and the footer note all come from
Mongo.

### `(blog)` — content marketing

A real blog with three published posts, an RSS feed, per-post OG image
generation and a rich-text editor in the admin. Exists for SEO; see
`docs/seo.md` for exactly what two audit passes fixed and what is left.

### `(admin)` — the dashboard

One page, `app/(admin)/admin/page.tsx`, that switches between panels. This is
where the business is actually run from.

| Panel | What it is for |
|---|---|
| **Dashboard** | What is waiting on you — counts, plus warnings when the voice agent or mail is unconfigured |
| **Leads** | Callback requests and what the agent did with them; stages, follow-ups, notes |
| **Calls** | Every conversation in either direction, transcript included |
| **Inbox** | Contact-form submissions and real email (IMAP), in one place |
| **Clients** | Who can sign in to the client portal; invitations |
| **Work / Pricing / Blog / Contact** | Editors for the corresponding site sections |
| **Settings** | Password change |

Chrome — card, table, button, field, empty states, dialog — lives in
`components/ui/admin/`. The panels' own logic lives in `components/ui/admin-*.tsx`.

### `(clients)` — the client portal

Newest of the four. Clients are invited by an admin, claim a single-use setup
link by email, and sign in behind their own cookie. Deliberately a *separate*
principal from admin: different collection, different cookie, different guard.

---

## Data

MongoDB, nine collections, no ORM. `lib/mongodb.ts` holds the connection.

| Collection | Holds |
|---|---|
| `leads` | A person, keyed on a digits-only `phoneKey` so both intake paths find-or-create |
| `calls` | A conversation, either direction, with transcript. Unique on `conversationId` |
| `messages` | Contact-form submissions and synced email |
| `posts` | Blog posts and drafts |
| `projects` | Portfolio entries |
| `admin_users` / `admin_sessions` | Staff, behind `bx_admin` |
| `clients` / `client_sessions` | Portal users, behind `bx_client` |

**A lead is a person; a call is a conversation.** That separation is load-bearing
and `CLAUDE.md` explains why at length. The short version: submit the form twice
and you are one lead with two calls.

---

## The lead pipeline, end to end

The single most important path in the repo.

```
form submit  →  POST /api/lead
                  ├─ rate limit          lib/rate-limit.ts
                  ├─ validate            lib/lead.ts
                  ├─ store               lib/lead-store.ts     ← before dialling
                  └─ dispatch            lib/elevenlabs.ts

the call happens

ElevenLabs  ──→  POST /api/calls/webhook   (signature checked, not optional)
                        ↓
                  lib/call-payload.ts   pure parsing, unit tested
                        ↓
                  lib/call-intake.ts    ← the single path both writers use
                        ↑
cron        ──→  POST /api/cron/call-sync
```

Both writers race deliberately. The unique index on `conversationId` is what
makes that safe — the second insert collides and returns null instead of
throwing. Do not replace it with a check-then-insert.

A second cron, `/api/cron/inbox-sync`, pulls IMAP mail into `messages` on the
same pattern.

---

## Layout of the tree

```
app/
  (site) (blog) (admin) (clients)   route groups, one layout each
  api/                              admin/*, clients/*, calls/*, cron/*, lead
  globals.css                       ALL component CSS, ~4,000 lines, deliberate
components/
  sections/                         one file per marketing section, in page order
  ui/                               reusable pieces + admin panels
  ui/admin/                         admin chrome only
  motion/                           Reveal, SplitText, Marquee, pin helpers
  providers/                        section observer, Lenis/GSAP wiring, admin theme
  blog/                             post rendering
lib/                                stores, auth, integrations, pure helpers
scripts/                            seed-admin, seed-blog, seed-pricing,
                                    seed-projects, backfill-leads
tests/                              node:test over pure logic only
docs/                               seo.md, pricing.md, competitors.md, this file
```

### Where the boundaries are in `lib/`

- **Stores** (`*-store.ts`) — the only things that touch Mongo.
- **Pure logic** (`call-payload.ts`, `client-schema.ts`, `lead.ts`,
  `contact-schema.ts`) — no network, no database, and therefore the only things
  under test.
- **Integrations** (`elevenlabs.ts`, `mailer.ts`, `imap-sync.ts`).
- **Auth** — `auth-core.ts` holds shared mechanics; `admin-auth.ts` and
  `client-auth.ts` are two separate principals that must never be merged.
- **Front-end infrastructure** (`gsap.ts`, `lenis.ts`, `reveal.ts`, `utils.ts`).

---

## Stack

Next 16.2.12 (App Router, Turbopack) · React 19.2.4 · Tailwind v4 (no config
file — tokens live in `@theme inline` in `app/globals.css`) · TypeScript 5 ·
MongoDB 7 · GSAP 3.15 with ScrollTrigger · Lenis 1.3.26 · lucide-react ·
Tiptap for the blog editor · Zod · nodemailer + imapflow.

Deployed by Docker (`Dockerfile`, `docker-compose.yml`). `metadataBase` is
`https://bluex.agency`.

## Integrations

| Service | For |
|---|---|
| **ElevenLabs** | The voice agent — outbound dispatch, inbound answering, transcripts |
| **MongoDB** | Everything persistent |
| **Cloudinary** | Image uploads from the admin |
| **SMTP / IMAP** | Client invitations out, the inbox in |

## Commands

```bash
npm run dev            # Turbopack dev server
npm run build          # production build
npm test               # node:test over pure logic — no database, no HTTP
npm run lint
npm run seed:admin     # also: seed:pricing, seed:blog, seed:projects, seed:backfill
```

Anything touching Mongo or HTTP is verified with curl against a running dev
server. There is no mocked-database suite here and that is on purpose.

---

## Current state

Live and working: the marketing site, the blog, the admin dashboard, the lead
pipeline with outbound dispatch, call recording in both directions, the IMAP
inbox, and the client portal. There are already real conversations in `calls`,
including inbound ones, synced from the live account.

Known outstanding work is tracked in **`CLAUDE.md` → Open items** and is not
duplicated here, because it moves. At the time of writing the notable ones are:
two settings in the ElevenLabs dashboard that cannot be fixed from this repo, a
Cloudinary key that still needs rotating, and unpublished pricing.
