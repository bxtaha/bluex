# Pricing

Researched 24 August 2026. Competitor figures and their sources are in
[competitors.md](competitors.md); this note is the recommendation and the
arithmetic behind it.

**Nothing here is implemented.** Every tier on the live site still says "get a
quote", and `priceRange` is still absent from the structured data — deliberately,
per `docs/seo.md`: a price band stated only to a crawler is one the page refuses
to state to readers. Publishing figures is a business decision, so this is a
proposal awaiting a yes.

## What the market charges

Condensed from the vendor pages read on 24 August 2026:

| | Price | Billing basis |
|---|---|---|
| Vapi | $0.05/min + model costs | Per minute, DIY |
| Retell | $0.07–0.31/min all-in | Per minute, DIY |
| Bland | $0.11–0.14/min + $0–499/mo | Per minute, DIY |
| **Goodcall** | **$79 / $129 / $249**/mo | **Per unique customer** (100/250/500) |
| **Sameday AI** | **$449 / $789**/mo | Per minute bundle (500 / 1,000) |
| Synthflow | from $30,000/year | Enterprise contract |
| Web build (WebFX survey) | $6,500–15,000 basic | Per project |

Two things stand out.

**There is a gap between $249 and $449.** Goodcall's self-serve ceiling and
Sameday's done-for-you floor are only $200 apart, and nothing sits between them.
That band — done-for-you, SMB-priced — is where BlueX's Voice Agent belongs.

**Only Goodcall bills in units a buyer understands.** Everyone else sells minutes.
An SMB owner cannot estimate their monthly minutes and knows it, which makes a
minute-based quote feel like a risk rather than a price. "250 leads called" is a
number they can check against their own pipeline.

## What it costs to deliver

This is the part that decides whether any of the above is safe to offer, and it
uses the provider already wired into `lib/elevenlabs.ts`.

[ElevenLabs Agents](https://elevenlabs.io/pricing/agents), read the same day:

| Plan | Monthly | Included minutes | Concurrency |
|---|---|---|---|
| Creator | $22 | 275 | 10 |
| Pro | $99 | 1,238 | 20 |
| Scale | $299 | 3,738 | 30 |
| Business | $990 | 12,375 | 40 |

Marginal rate **$0.08/min**, the same on every tier. Burst is **$0.16/min** at up
to 3× concurrency. **LLM and telephony are billed separately, at cost** — that
exclusion is easy to miss and it is roughly a third of the true number.

Building up a realistic all-in cost per minute:

```
ElevenLabs call            $0.080
LLM (a mid-tier model)     $0.030   ← excluded from the $0.08
Telephony (Twilio outbound) $0.015   ← excluded from the $0.08
                           ──────
                           ~$0.125 / min
```

A qualifying callback that connects runs perhaps 3 minutes, so **~$0.38 per
connected call**. Not every dial connects; assume 60%, and the cost per *lead
attempted* is roughly **$0.25–0.40**.

So 250 leads a month costs about **$60–100 in variable cost**, plus whatever tier
covers the concurrency. That is the number every price below has to clear.

## Recommendation

### Voice Agent — publish, and bill per lead

**Setup: $1,500 one-time. Then:**

| Tier | Monthly | Leads called / mo | Variable cost | Gross margin |
|---|---|---|---|---|
| **Starter** | **$390** | 150 | ~$45 | ~88% |
| **Growth** | **$690** | 400 | ~$120 | ~83% |
| **Scale** | **$1,190** | 1,000 | ~$300 | ~75% |

Overage **$1.50/lead** beyond the allowance — roughly 4–5× variable cost, so it
is profitable without being punitive, and it makes the allowance feel generous
rather than like a trap.

Five things this is doing deliberately:

1. **Priced per lead called, not per minute.** Copying Goodcall's best idea. It is
   the unit the buyer can estimate, it is the unit the promise is made in
   ("every lead called in five minutes"), and it quietly moves call-length risk
   to us — where it belongs, because we control the prompt.
2. **Lands in the empty band.** $390 sits above Goodcall's $249 ceiling and below
   Sameday's $449 floor, and unlike Goodcall it is done-for-you.
3. **The setup fee is the qualifier.** $1,500 covers real work — prompt design,
   telephony, CRM and calendar wiring, testing — and it filters out the buyer who
   wants a toolkit and would have been happier with Vapi. Sameday publishes no
   setup fee, which is a gap worth exploiting from the other direction: charging
   for implementation signals that implementation is the product.
4. **Margins hold at the bottom.** ~88% on Starter, and it is the *highest*-margin
   tier, so the entry price does not need defending.
5. **It matches the site's own copy.** "One-time setup, then a flat monthly plan"
   is already what the Voice Agent tier promises. This just puts numbers on the
   sentence.

### Launch — publish a floor, not a price

**"From $4,500."**

Against the WebFX survey's $6,500–15,000 basic-build band, that reads as
deliberately keen rather than cheap, and it is defensible for a custom-coded
single-page site delivered in weeks. Ecommerce should stay quoted — the survey
puts that functionality alone at $5,000–25,000 and the variance is real.

A floor, not a bracket. "From" invites the conversation; a range invites
negotiation from the top of it.

### Full Stack — price it as the thesis, not the upsell

**"From $5,500 setup, then Voice Agent monthly."**

That is a **$500 discount** against buying both separately ($4,500 + $1,500), and
it should be stated as a number, because the discount is the argument: the two
are cheaper together because they genuinely are less work together — the site is
built knowing the agent plugs into it.

Per [competitors.md](competitors.md) this tier is the actual differentiator and is
currently positioned third, reading like an upsell. If pricing is published, this
is the one to feature.

## What publishing changes elsewhere

Three consequences, none of them optional if figures go live:

1. **`priceRange` becomes honest.** `docs/seo.md` records it as deliberately
   absent because every tier said "get a quote". With published figures the
   LocalBusiness structured data should carry a band, and the note in that file
   should be updated rather than left contradicting the page. This is the one
   SEO-visible consequence.
2. **`priceAnchor` already exists.** `lib/pricing-store.ts` has the field on every
   tier, currently `""`, capped at 60 characters and editable in the admin
   pricing panel. No schema change is needed — this is a content edit, which is
   also why it can be reversed in a minute if the market says no.
3. **The lead form's promise gets sharper.** A visitor who knows the price before
   they submit is a better-qualified lead, and the five-minute callback then
   qualifies against budget rather than discovering it.

## The case against publishing

Stated plainly, because it is not a weak case and the decision is not mine.

Published prices lose the ability to charge a Gulf enterprise four times what a
Canadian sole trader pays, and the trust strip claims five markets with very
different willingness to pay. Quote-based pricing is how small agencies handle
that, and it works.

The counter-argument is that quote-gating costs volume at the bottom of the market
— which is the SMB band this pricing targets, and the band Synthflow has
abandoned at $30k and Goodcall serves at $249 with a checkout.

**A middle path, if the tension is uncomfortable:** publish only the anchors
("from $390/mo", "from $4,500") and keep every CTA quote-based. That is what the
existing `priceAnchor` field was built for, it captures most of the qualification
benefit, and it leaves room to quote up. If one option is to be taken from this
note without further discussion, take that one.

## Confidence

- **Competitor and cost figures: high.** Read from vendor pricing pages on 24
  August 2026, cited inline. Re-check them before quoting anyone — this category
  reprices often, and Retell's page alone lists per-model rates that will move.
- **The recommended numbers: a proposal, not a finding.** They are derived from
  real costs and a real competitive gap, but no BlueX customer has been asked
  what they would pay, and no deal has been won or lost at these figures. Treat
  the *structure* — per-lead billing, a setup fee, the $390–1,190 band — as the
  substance, and the specific digits as a starting point.
- **Not researched:** regional price sensitivity across AE/SA/QA/CA/AU, which is
  the single biggest unknown and the one the case against publishing rests on.
