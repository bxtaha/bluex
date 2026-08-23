# Competitors

Researched 24 August 2026. Every figure below was read from the vendor's own
pricing page on that date, not from a summary — the URLs are in each section so
they can be re-checked.

**Method, and its limit.** Keyword search was unavailable during this pass, so
competitors were reached by fetching pricing pages directly. That makes the
numbers primary-source and unusually reliable, but it means discovery was not
exhaustive: this covers the categories BlueX actually competes in and the named
players within them, and it will have missed regional agencies in the Gulf,
Canada and Australia that do not rank or advertise in English-language search.
Those are the likeliest omission and the one worth a second pass.

## What BlueX is selling

Established from the codebase and site copy rather than assumed —
`lib/pricing-store.ts`, `lib/site.ts`, and the sections in `components/sections/`:

- **Launch** — a custom-coded website. "No templates", mobile-first, SEO-ready,
  "weeks, not months". CTA: get a quote.
- **Voice Agent** — an AI agent that calls every inbound lead within five
  minutes, qualifies against the client's own criteria, books into their
  calendar. "One-time setup, then a flat monthly plan." CTA: get a call within
  five minutes.
- **Full Stack** — both, "built to work as one system".

Tagline: *Every lead called back in five minutes.* Markets claimed in the trust
strip: **AE, SA, QA, CA, AU**. Registered address is London; phone is US.

Two things about this shape matter for positioning:

1. **The offer is outbound, not inbound.** Almost every voice-AI competitor sells
   *answering* calls. BlueX sells *making* them, triggered by a form
   submission. That is a different product with a different buyer trigger, and
   most of the category's marketing does not address it.
2. **Nobody else bundles the website with the agent.** This is the genuine
   differentiator and the site currently states it as a feature ("Site structured
   so the agent plugs straight in") rather than as the reason to buy.

## The four categories BlueX competes with

Not one market. Buyers arrive from four different places and only two of them are
really contested.

### 1. Developer platforms — the DIY route

The technical buyer's alternative. Self-serve, per-minute, no implementation.

| Vendor | Rate | Platform fee | Notes |
|---|---|---|---|
| [Vapi](https://vapi.ai/pricing) | **$0.05/min** hosting | $0 on Build | Model costs passed through. 10 concurrent lines included, then $10/line/mo. HIPAA $2,000/mo, ZDR $1,000/mo |
| [Retell](https://www.retellai.com/pricing) | **$0.07–0.31/min** all-in | "No platform fees" | Infra $0.055 + TTS $0.015 + telephony $0.015 + LLM. 20 concurrent free, then $8/call/mo. Billed to the second |
| [Bland](https://www.bland.ai/pricing) | **$0.14 / $0.12 / $0.11**/min | **$0 / $299 / $499**/mo | Rate covers LLM+STT+TTS, no token pass-through. Telephony separate |

Bland's own page puts a fully-loaded Vapi or Retell stack at **$0.11–0.30/min**,
which matches Retell's published components.

**Weakness:** all three sell a toolkit. The buyer still has to write the prompt,
wire the telephony, connect the CRM, and keep it working. For a plumber or a
clinic that is not a lower price, it is an unpriced project. This is the gap
BlueX sells into and the comparison BlueX should never invite on price.

### 2. Done-for-you vertical services — the real competition

| Vendor | Price | Model |
|---|---|---|
| [Sameday AI](https://www.sameday.ai/pricing) | **$449**/mo (500 min) · **$789**/mo (1,000 min) · Enterprise custom | Done-for-you, demo-gated, home services. No setup fee published. Live "in 30 minutes" |
| [Goodcall](https://www.goodcall.com/pricing) | **$79 / $129 / $249**/mo per agent (15% off annual) | Self-serve. **Unlimited minutes**, capped on *unique customers* (100/250/500), then $0.50 each |
| [Synthflow](https://www.synthflow.ai/pricing) | **From $30,000/year** | Enterprise only. Scoped on volume, concurrency, telephony, integrations, security |

This is the band BlueX actually sits in, and the spread is the finding: from **$79
to $30,000/year** for nominally the same category. There is a wide, thinly
defended gap between Goodcall's self-serve ceiling (~$249) and Sameday's
done-for-you floor ($449).

**Goodcall's billing model is the single most transferable idea here.** It bills
per *unique customer contacted*, not per minute. An SMB owner knows what 250
customers means. Nobody knows what 500 minutes means. More on this in
[pricing.md](pricing.md).

**Sameday's weakness** is that it is vertical (home services) and inbound-led.
Its whole page is about not missing calls. It does not claim five-minute outbound
callback.

**Synthflow's weakness** is the $30k floor — it has abandoned the SMB entirely,
which is free ground.

### 3. Web design agencies

BlueX's Launch tier competes here.
[WebFX's 2026 survey](https://www.webfx.com/web-design/pricing/) of 250 US
marketing professionals:

- Overall range **$1,000 – $30,000+**, complex builds $100,000+
- **Basic small-business build: $6,500 – $15,000**
- Mid-sized: $15,000 – $50,000
- Ecommerce functionality alone: $5,000 – $25,000
- Bundled SEO: $2,000 – $10,000
- Sourcing: 42% in-house, 33% agency, 26% freelancer

Treat the provider-type figures on that page with care — they are *annual spend*,
not project cost, which is why "agency: $501–$1,000" appears below the project
bands. The page's own caveat.

This category is enormous, commoditised, and not where BlueX wins. It is,
however, where the buyer's *budget expectation* is set, and $6,500–15,000 for a
basic build is a useful anchor.

### 4. Doing nothing

The largest competitor, and the one the site already argues against. The
five-minute claim only lands because the alternative is a form submission
somebody reads on Monday.

**Caveat worth recording:** the widely-cited "call within 5 minutes and you are
21× more likely to qualify a lead" figure (Lead Response Management / InsideSales,
via HBR) could not be verified in this pass — the sources I could reach 404'd.
The site does not currently cite a statistic, and it should not start citing that
one until somebody has read the original study. An unverifiable number on a page
whose whole promise is speed is a bad trade.

## Where this leaves positioning

**The current site leads with the wrong noun.** It leads with the agent — a
mechanism — in a category where three developer platforms and two managed
services all lead with the same mechanism. What nothing else in the table above
can say is:

> The site that captures the lead and the agent that calls it are one system,
> built by the same people, and the call happens in five minutes.

That is a claim about *the seam between two products*, and every competitor
either sells one side or the other. Sameday cannot say it. Vapi cannot say it. A
web agency cannot say it.

Three concrete recommendations:

1. **Lead with the seam, not the agent.** "Full Stack" is currently the third
   tier and reads like an upsell. It is the actual differentiator and should be
   the thesis.
2. **Never compete on per-minute price.** The moment the conversation is
   $/minute, Vapi at $0.05 wins and the implementation work becomes invisible.
   Price on outcomes — leads called — for the same reason.
3. **Own outbound explicitly.** The category's language is "never miss a call".
   BlueX's is "never lose a lead". Those sound similar and are different
   products; the copy should make the difference impossible to miss, because the
   buyer currently has no vocabulary for it.

## Trust signals: where BlueX is thin

Competitors in category 2 all lead with logos, review counts and integration
badges. BlueX has a portfolio section and a trust strip of markets. Per
`docs/seo.md` the site has **7 backlinks across 6 domains**, which is the lowest
score on its audit.

The two are the same problem. Named clients with a stated outcome ("X leads
called, Y booked") would serve conversion *and* be the thing worth linking to —
and content worth citing is the only route to backlinks that a code change can
influence. Three blog posts of roughly a minute each is not it.
