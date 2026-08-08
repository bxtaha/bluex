import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * Pricing tiers: schema, defaults, and every database operation.
 *
 * Deliberately free of framework imports. `lib/pricing.ts` adds the Next cache
 * layer on top; keeping that separate is what lets the seed script — plain Node
 * with no bundler — import this directly. Pulling `next/cache` in here made the
 * seed unrunnable, which is a poor trade for one import.
 */

/** What a CTA does. Kept as a closed set so the client cannot be handed a URL. */
export type CtaAction = "lead-form" | "contact";

export type PricingTier = {
  id: string;
  order: number;
  name: string;
  tagline: string;
  /** "From $4,000" — free text, and blank is a valid choice. */
  priceAnchor: string;
  features: string[];
  ctaLabel: string;
  ctaAction: CtaAction;
  featured: boolean;
  visible: boolean;
};

type PricingDoc = Omit<PricingTier, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<PricingDoc>> {
  const db = await getDb();
  return db.collection<PricingDoc>("pricingTiers");
}

function toTier(doc: PricingDoc & { _id: ObjectId }): PricingTier {
  return {
    id: doc._id.toHexString(),
    order: doc.order,
    name: doc.name,
    tagline: doc.tagline,
    priceAnchor: doc.priceAnchor ?? "",
    features: doc.features ?? [],
    ctaLabel: doc.ctaLabel,
    ctaAction: doc.ctaAction === "lead-form" ? "lead-form" : "contact",
    featured: Boolean(doc.featured),
    visible: doc.visible !== false,
  };
}

/**
 * The three tiers the site ships with.
 *
 * Also the fallback when the database cannot be reached. A marketing page that
 * renders an empty hole because Atlas is having a moment is worse than one
 * showing slightly stale copy, and this content changes rarely enough that the
 * two are almost always identical.
 */
export const DEFAULT_TIERS: Omit<PricingTier, "id">[] = [
  {
    order: 0,
    name: "Launch",
    tagline: "For businesses that need a proper site, fast.",
    priceAnchor: "",
    features: [
      "Custom designed and coded, no templates",
      "Built to load fast and convert",
      "Mobile-first, SEO-ready",
      "Delivered in weeks, not months",
    ],
    ctaLabel: "Get a quote",
    ctaAction: "contact",
    featured: false,
    visible: true,
  },
  {
    order: 1,
    name: "Voice Agent",
    tagline: "For businesses losing leads to slow follow-up.",
    priceAnchor: "",
    features: [
      "AI agent calls every lead within five minutes",
      "Qualifies against your own criteria",
      "Books straight into your calendar",
      "One-time setup, then a flat monthly plan",
    ],
    ctaLabel: "Get a call within 5 minutes",
    ctaAction: "lead-form",
    featured: true,
    visible: true,
  },
  {
    order: 2,
    name: "Full Stack",
    tagline: "Website and voice agent, built to work as one system.",
    priceAnchor: "",
    features: [
      "Everything in Launch and Voice Agent",
      "Site structured so the agent plugs straight in",
      "Ongoing support and optimisation",
      "Priority turnaround",
    ],
    ctaLabel: "Talk to us",
    ctaAction: "contact",
    featured: false,
    visible: true,
  },
];

/** Everything, including hidden tiers. For the admin panel. */
export async function listAllTiers(): Promise<PricingTier[]> {
  const docs = await (await collection())
    .find({})
    .sort({ order: 1 })
    .toArray();
  return docs.map((doc) => toTier(doc as PricingDoc & { _id: ObjectId }));
}

/** Raw read, uncached. `lib/pricing.ts` wraps this for the public section. */
export async function readVisibleTiersUncached(): Promise<PricingTier[]> {
  const docs = await (await collection())
    .find({ visible: { $ne: false } })
    .sort({ order: 1 })
    .toArray();
  return docs.map((doc) => toTier(doc as PricingDoc & { _id: ObjectId }));
}

export function withFallbackIds(
  tiers: Omit<PricingTier, "id">[],
): PricingTier[] {
  return tiers.map((tier, i) => ({ ...tier, id: `default-${i}` }));
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

export type TierInput = Partial<Omit<PricingTier, "id">>;

/** Trims and bounds whatever the admin form sent. */
function sanitise(input: TierInput): Partial<Omit<PricingTier, "id">> {
  const out: Partial<Omit<PricingTier, "id">> = {};

  if (typeof input.name === "string") out.name = input.name.trim().slice(0, 80);
  if (typeof input.tagline === "string") out.tagline = input.tagline.trim().slice(0, 200);
  if (typeof input.priceAnchor === "string") out.priceAnchor = input.priceAnchor.trim().slice(0, 60);
  if (typeof input.ctaLabel === "string") out.ctaLabel = input.ctaLabel.trim().slice(0, 60);
  if (input.ctaAction === "lead-form" || input.ctaAction === "contact") {
    out.ctaAction = input.ctaAction;
  }
  if (Array.isArray(input.features)) {
    out.features = input.features
      .filter((f): f is string => typeof f === "string")
      .map((f) => f.trim().slice(0, 200))
      // An empty row is how a feature gets deleted in the editor.
      .filter(Boolean)
      .slice(0, 20);
  }
  if (typeof input.featured === "boolean") out.featured = input.featured;
  if (typeof input.visible === "boolean") out.visible = input.visible;
  if (typeof input.order === "number" && Number.isFinite(input.order)) {
    out.order = Math.trunc(input.order);
  }

  return out;
}

export async function createTier(input: TierInput): Promise<PricingTier> {
  const tiers = await collection();
  const last = await tiers.find({}).sort({ order: -1 }).limit(1).toArray();

  const doc: PricingDoc = {
    order: (last[0]?.order ?? -1) + 1,
    name: "New tier",
    tagline: "",
    priceAnchor: "",
    features: [],
    ctaLabel: "Get in touch",
    ctaAction: "contact",
    featured: false,
    visible: false,
    ...sanitise(input),
  };

  const result = await tiers.insertOne(doc);
  if (doc.featured) await demoteOtherFeatured(result.insertedId);

  return toTier({ ...doc, _id: result.insertedId });
}

/**
 * "Featured" is a position, not a property — two highlighted tiers highlight
 * nothing. Setting it on one clears it everywhere else.
 */
async function demoteOtherFeatured(keep: ObjectId): Promise<void> {
  await (await collection()).updateMany(
    { _id: { $ne: keep }, featured: true },
    { $set: { featured: false } },
  );
}

export async function updateTier(
  id: string,
  input: TierInput,
): Promise<PricingTier | null> {
  if (!ObjectId.isValid(id)) return null;

  const _id = new ObjectId(id);
  const patch = sanitise(input);
  const tiers = await collection();

  const updated = await tiers.findOneAndUpdate(
    { _id },
    { $set: patch },
    { returnDocument: "after" },
  );
  if (!updated) return null;

  if (patch.featured === true) await demoteOtherFeatured(_id);

  return toTier(updated as PricingDoc & { _id: ObjectId });
}

export async function deleteTier(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

/**
 * Rewrites every tier's `order` from the given sequence.
 *
 * Takes the whole list rather than a "move up" instruction: two admins dragging
 * at once, or a stale page, would otherwise interleave into an order neither
 * asked for. Writing the full intended sequence makes the last save win
 * cleanly.
 */
export async function reorderTiers(ids: string[]): Promise<boolean> {
  const valid = ids.filter((id) => ObjectId.isValid(id));
  if (valid.length === 0) return false;

  const tiers = await collection();
  await tiers.bulkWrite(
    valid.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { order: index } },
      },
    })),
  );

  return true;
}

/** Used by the seed script. Only writes when the collection is empty. */
export async function seedTiers(): Promise<number> {
  const tiers = await collection();
  if ((await tiers.countDocuments()) > 0) return 0;
  const result = await tiers.insertMany(DEFAULT_TIERS.map((tier) => ({ ...tier })));
  return result.insertedCount;
}
