# SEO: where this stands

Written 23 August 2026, after two passes against a Seobility audit of the home
page. Updated 24 August 2026 for the client portal. This is the standing note —
what is done, what is left, and what was measured rather than assumed. Update it
rather than starting a third list.

Scores at the time of the first audit: on-page **61**. Meta 80% · structure 58%
· quality 79% · links 93% · **server config 0%** · **backlinks 18%**.

## The client portal (24 August 2026)

Adding `/clients` added three routes, and the only SEO work that mattered was
keeping every one of them out of the index. Done:

- `noindex, nofollow` on the `(clients)` route group's layout, matching `(admin)`.
- `/clients` added to `robots.ts` disallow. Verified in the built output:
  `Disallow: /api/`, `/admin`, `/clients`.
- `sitemap.ts` needed no change — it is an explicit allowlist (home, blog, posts),
  so new routes are excluded by construction rather than by anyone remembering.
- All three routes build as `ƒ` (dynamic), confirmed in `next build` output. They
  read cookies, so a prerendered copy served from a cache would be a real bug and
  not merely an SEO one.

**One of those is not belt and braces.** `/clients/setup` carries an invitation
token in its query string. A crawler that fetched it would write a live
credential into its logs and keep it in a cached snippet after the link had been
used. The `noindex` is the guarantee; the robots disallow is what stops the fetch
happening at all.

Nothing else changed. No public page gained or lost a link, and the marketing
site's metadata is untouched — the portal is linked from nowhere on it, which is
also why it needs no internal-linking consideration.

**Pricing is still unpublished, so `priceRange` is still correctly absent.** See
the judgement call in section 5 below; `docs/pricing.md` now proposes figures, and
if they are ever published that note and this one both need updating together.

## Done

Two commits, `f7be742` and `69ed6cd`.

| Finding | Result |
|---|---|
| www and non-www both served a live 200 | 301 in `next.config.ts`, verified by `curl -I` |
| Six security headers missing, F grade | All six + `poweredByHeader: false` |
| Three tools could not finish loading the page | Splash cursor's unbounded rAF loop now idles |
| Meta description truncated in SERPs | 176 → 140 chars (~850px vs the 1000px ceiling) |
| H1 doubled in the HTML | Single clean text node |
| 46 headings | 20 |
| No Apple touch icon | `app/apple-icon.png`, 180×180 |
| Structured data incomplete | `telephone`, `address`, `image`, `logo` added |
| Anchor text 230+ chars on blog cards | Title only, via a stretched link |
| H1's words absent from body copy | All six present |
| Repeated anchor text | None |
| No sharing on the home page | Four links in the footer |

Two things in there are worth remembering because they cost time to find.

**The load failure was CPU, not network.** Every tool said "slow page" and every
tool was measuring the same thing wrong. Measured directly, `load` fires at
**1.2s** over 21 small files and TTFB is ~275ms. What actually happened is that
`splash-cursor.jsx` ran a full-screen WebGL fluid simulation on an rAF loop with
no visibility, idle or pointer-type gating — 39fps forever, on a machine *with* a
GPU. Lighthouse and GTmetrix both decide a page has finished loading by waiting
for it to go quiet, and it never did. On their headless VMs there is no GPU
either, so every frame was software-rasterised. If a lab tool ever times out on
this site again, look for a loop before looking for a byte.

**`permanent: true` in Next's `redirects()` emits a 308, not a 301.** Both are
permanent and Google follows both, but 308 exists to preserve the request method
and is the one older crawlers may not recognise. Use `statusCode: 301`. This
shipped wrong once with a comment claiming otherwise; `curl -I` caught it.

## Remaining

Ordered by what would move the needle most.

### 1. Backlinks — the long pole

**7 backlinks, 6 referring domains, 6 unique IPs.** The lowest score on the
report and the only finding nothing in this repository can fix. On-page work is
now largely exhausted; this is what is left. Directory listings, partner
mentions, and content worth citing.

### 2. Put a CDN in front — closes the response-time warning

The rescan still warns: response time **0.74s** against a 0.4s target. That is
not the origin being slow. Measured from here, five runs:

```
ttfb=0.244  0.245  0.259  0.217  0.221     (tls ≈ 0.145 of each)
```

Median TTFB **245ms**, of which roughly 145ms is the TLS handshake — call it
**~100ms of actual server time**, comfortably inside the target. The audit's
0.74s is the distance from Seobility's crawler to a single-region origin. The
fix is an edge cache serving the prerendered HTML from a PoP near whoever asks,
and there is no code change that substitutes for it.

The CDN is also the better home for two things currently done in the app:

- the **www → non-www 301**, which at the edge never wakes the origin;
- the **security headers**, same reason.

Both stay in `next.config.ts` regardless — they cost almost nothing and mean the
guarantees survive a change of hosting. But if the CDN also injects headers,
check for duplicates.

### 3. Confirm the load fix against the real tools

The splash-cursor change was verified locally by counting WebGL draw calls:
**0 over 2s idle → 1008 over 1s while moving → 0 again after the 2.5s timeout.**
That is the mechanism working. What has *not* been confirmed is the verdict of
the tools that were failing, because they run against the live host:

- **PageSpeed Insights** — was failing twice with `RPC::DEADLINE_EXCEEDED`
- **GTmetrix** — was giving up after 2 minutes

Re-run both. If they still time out, the remaining suspects are the other two
canvases (`kinetic-grid.tsx`, `particle-orb.tsx`) — both already gated on
`IntersectionObserver` and `document.hidden`, so check that gating actually
holds before touching anything else — and the GSAP/Lenis ticker, which holds an
rAF loop open for the life of the page by design.

### 4. Re-verify the rest after deploy

- **securityheaders.com** — expect F → A
- **Rich Results Test** — expect the Local Business item complete except
  `priceRange`
- **Seobility rescan** — expect the four warnings from the second pass to clear

### 5. Judgement calls to revisit, not bugs

**`priceRange` is deliberately absent.** Google accepts anything from `$$` to a
figure, but every tier on the pricing section says "get a quote". A price band
stated only to a crawler is one the page itself refuses to state to readers.
Revisit if pricing is ever published.

**The heading ratio may still warn.** 20 headings against 1711 words is one
every 86, up from one every 62. If Seobility still objects, the answer is more
body text, not fewer headings — what is left is 1 H1, 12 section H2s, 3 service
H3s, 3 blog post titles and 1 other, and cutting into that starts removing
structure that genuinely helps.

**A London address with a US phone number** (`+1 240 820 3149`). Normal for a
remote agency and Google will not reject it. If the Local Business result should
show a UK number, change it in the admin contact panel — the JSON-LD reads the
same value the page does, so it follows automatically.

**`areaServed` is `AE, SA, QA, CA, AU`**, matching the trust strip. The UK is now
the registered address but is not claimed as a market. Deliberate.

### 6. Content depth

Three posts, roughly a minute each. Thin. This is the same lever as backlinks —
pages worth linking to are what earn links — and it is also the only route to
long-tail traffic, since the marketing page is one URL competing for one idea.

### 7. Smaller, still open

- **`metadataBase` / `NEXT_PUBLIC_SITE_URL`** is `https://bluex.agency`.
  Deploying elsewhere first points canonicals and OG images at the wrong host —
  and now the www redirect derives its canonical host from the same variable.
- **Internal link targets are coarse.** Three footer links under "Services" all
  point at `#services`, and "Book a call" points at `#top`. Fine for a one-page
  site; revisit if sub-pages ever exist.
- **`app/faviconx.ico`** — 87KB, tracked, unused. Next only serves
  `app/favicon.ico`. Removal offered, no answer yet.
- **91 Dependabot advisories** (3 critical, 41 high). Not SEO, but GitHub reports
  them on every push, and CLAUDE.md recorded 87 — it is drifting up.

## How to measure

Do not trust a single sample; several claims in this note's history were wrong
on one reading and right on five.

Response time and redirects, from the shell:

```bash
curl -s -o /dev/null -w "ttfb=%{time_starttransfer} tls=%{time_appconnect}\n" https://bluex.agency/
curl -sI -H "Host: www.bluex.agency" https://bluex.agency/pricing | head -3
```

Headings, anchor text and H1 words are all easier to count in the page than to
reason about. A caution learned the hard way: **`document.scrollWidth` flickers
by 1px on this page** — the marquee animates and the sub-pixel rounding lands
either side of the boundary. Sampling it once produced a confident and entirely
wrong claim about a regression. Sample 40 frames and compare distributions
against the live site before believing a horizontal-overflow finding.

Anything about the *rendered* page — the fluid sim, canvas gating, layout
collisions — has to be measured in a browser. The share row in the footer, for
one, was the first thing in that footer to reach the right edge, where the
back-to-top button lives; at 959px it overlapped by 33px and part of a button
was unclickable. Numbers found that; the screenshot did not.
