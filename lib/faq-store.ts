import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * FAQs: schema, defaults, and every database operation.
 *
 * Framework-free on purpose, like `pricing-store.ts`. `lib/faq.ts` adds the
 * Next cache layer on top; keeping them apart is what lets the seed script —
 * plain Node, no bundler — import this directly.
 */

export type Faq = {
  id: string;
  order: number;
  question: string;
  answer: string;
  /**
   * Grouping, for filter pills later. Stored and editable now; the section
   * renders one flat list, so nothing depends on it yet.
   */
  category: string;
  visible: boolean;
};

type FaqDoc = Omit<Faq, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<FaqDoc>> {
  const db = await getDb();
  return db.collection<FaqDoc>("faqs");
}

function toFaq(doc: FaqDoc & { _id: ObjectId }): Faq {
  return {
    id: doc._id.toHexString(),
    order: doc.order,
    question: doc.question,
    answer: doc.answer,
    category: doc.category ?? "",
    visible: doc.visible !== false,
  };
}

/** The eight the site ships with, and the fallback when Mongo is unreachable. */
export const DEFAULT_FAQS: Omit<Faq, "id">[] = [
  {
    order: 0,
    category: "AI Voice Agent",
    question: "Is the AI call actually real, or a recording?",
    answer:
      "It's a real conversation. The agent speaks naturally, listens, answers questions about your business and handles back-and-forth. Try it yourself — the demo on this page is the same agent your leads would get.",
    visible: true,
  },
  {
    order: 1,
    category: "AI Voice Agent",
    question: "What happens if the agent can't answer something?",
    answer:
      "It's built around your criteria and your information, so it handles the common ground confidently. Anything outside that, it takes the details, books the meeting and hands you the full transcript so you're never walking in blind.",
    visible: true,
  },
  {
    order: 2,
    category: "AI Voice Agent",
    question: "What does it cost to run each month?",
    answer:
      "There's a one-time build and setup fee, then a flat monthly plan that covers the phone number, the voice minutes and ongoing maintenance. You get a fixed number of calls included, so your bill doesn't move around month to month.",
    visible: true,
  },
  {
    order: 3,
    category: "Working with us",
    question: "How long does it take to launch?",
    answer:
      "A voice agent is typically live within a couple of weeks. A full custom site depends on scope — you'll get a fixed timeline with your quote before anything starts.",
    visible: true,
  },
  {
    order: 4,
    category: "Working with us",
    question: "Which countries do you work with?",
    answer:
      "We work remotely with businesses across the UAE, Saudi Arabia, Qatar, Canada and Australia. Everything is handled over calls and email, so location isn't a constraint.",
    visible: true,
  },
  {
    order: 5,
    category: "Working with us",
    question: "What happens to the data from the calls?",
    answer:
      "Call transcripts and lead details are yours. They're stored securely and passed straight into your calendar and your inbox — we don't sell, share or reuse them.",
    visible: true,
  },
  {
    order: 6,
    category: "Websites",
    question: "Do you use templates or page builders?",
    answer:
      "No. Everything is designed and coded from scratch around how you actually sell. That's why the sites load fast and why the AI agent plugs straight in.",
    visible: true,
  },
  {
    order: 7,
    category: "Websites",
    question: "What if I already have a website?",
    answer:
      "The voice agent can be added to almost any existing site. If your current site is holding you back, we'll tell you honestly rather than sell you a rebuild you don't need.",
    visible: true,
  },
];

export function withFallbackIds(faqs: Omit<Faq, "id">[]): Faq[] {
  return faqs.map((faq, i) => ({ ...faq, id: `default-${i}` }));
}

/** Everything, hidden included. For the admin panel. */
export async function listAllFaqs(): Promise<Faq[]> {
  const docs = await (await collection()).find({}).sort({ order: 1 }).toArray();
  return docs.map((doc) => toFaq(doc as FaqDoc & { _id: ObjectId }));
}

/** Raw read, uncached. `lib/faq.ts` wraps this for the public section. */
export async function readVisibleFaqsUncached(): Promise<Faq[]> {
  const docs = await (await collection())
    .find({ visible: { $ne: false } })
    .sort({ order: 1 })
    .toArray();
  return docs.map((doc) => toFaq(doc as FaqDoc & { _id: ObjectId }));
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

export type FaqInput = Partial<Omit<Faq, "id">>;

function sanitise(input: FaqInput): Partial<Omit<Faq, "id">> {
  const out: Partial<Omit<Faq, "id">> = {};

  if (typeof input.question === "string") out.question = input.question.trim().slice(0, 300);
  // Roomy, because an answer is a paragraph — but bounded, so one paste cannot
  // put a megabyte into a document that renders on the marketing page.
  if (typeof input.answer === "string") out.answer = input.answer.trim().slice(0, 2000);
  if (typeof input.category === "string") out.category = input.category.trim().slice(0, 60);
  if (typeof input.visible === "boolean") out.visible = input.visible;
  if (typeof input.order === "number" && Number.isFinite(input.order)) {
    out.order = Math.trunc(input.order);
  }

  return out;
}

export async function createFaq(input: FaqInput): Promise<Faq> {
  const faqs = await collection();
  const last = await faqs.find({}).sort({ order: -1 }).limit(1).toArray();

  const doc: FaqDoc = {
    order: (last[0]?.order ?? -1) + 1,
    question: "New question",
    answer: "",
    category: "",
    // Hidden to start, so nothing half-written appears on the site.
    visible: false,
    ...sanitise(input),
  };

  const result = await faqs.insertOne(doc);
  return toFaq({ ...doc, _id: result.insertedId });
}

export async function updateFaq(id: string, input: FaqInput): Promise<Faq | null> {
  if (!ObjectId.isValid(id)) return null;

  const updated = await (await collection()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: sanitise(input) },
    { returnDocument: "after" },
  );

  return updated ? toFaq(updated as FaqDoc & { _id: ObjectId }) : null;
}

export async function deleteFaq(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

/**
 * Rewrites every `order` from the given sequence.
 *
 * Takes the whole list rather than a "move up" instruction, for the same reason
 * the pricing reorder does: two tabs applying relative moves against different
 * starting states interleave into an order neither asked for.
 */
export async function reorderFaqs(ids: string[]): Promise<boolean> {
  const valid = ids.filter((id) => ObjectId.isValid(id));
  if (valid.length === 0) return false;

  await (await collection()).bulkWrite(
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
export async function seedFaqs(): Promise<number> {
  const faqs = await collection();
  if ((await faqs.countDocuments()) > 0) return 0;
  const result = await faqs.insertMany(DEFAULT_FAQS.map((faq) => ({ ...faq })));
  return result.insertedCount;
}
