import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import { phoneKey } from "./call-payload.ts";
import type { LeadSource } from "./lead.ts";

/**
 * `leads` — everyone who asked to be called back, and what happened when we
 * called.
 *
 * The lead is written *before* the call is placed, which is the whole reason
 * this file exists. The previous route handed the payload straight to a webhook
 * and kept nothing: a voice provider having a bad afternoon meant the visitor
 * got an error and we were left with no name, no number and no way to try
 * again. Storage first, dispatch second, outcome recorded back onto the same
 * document.
 *
 * A lead is a person now, not a submission — a phone number is unique, and a
 * transcript lives on the call it belongs to (`call-store.ts`), not here. This
 * is what makes "call again" and "they called back" the same record instead of
 * two that quietly disagree.
 *
 * Framework-free like the other `*-store` files, so a cron job or a plain Node
 * script can import it without a bundler.
 */

/**
 * Where a lead is in its lifecycle.
 *
 * `not_configured` is deliberately distinct from `failed`. A lead nobody tried
 * to call because the credentials are absent is an operator problem with a
 * one-line fix; a lead that was tried and refused is a different problem. A
 * single "didn't happen" state would hide which one you have — the same
 * mistake the inbox avoids by reporting IMAP configuration separately from
 * IMAP errors.
 */
export type CallStatus =
  | "pending"
  | "dispatched"
  | "completed"
  | "failed"
  | "not_configured";

export type LeadStage = "new" | "contacted" | "qualified" | "won" | "lost";

export type LeadNote = {
  body: string;
  at: Date;
  author: string;
};

export type Lead = {
  id: string;

  name: string;
  business: string;
  phone: string;
  /** Digits only. Unique — one lead per human. */
  phoneKey: string;
  email: string;
  source: LeadSource;

  /**
   * Where this person is commercially. A different axis from `callStatus`,
   * which only ever describes whether our outbound dispatch went out — a lead
   * can be `completed` and `qualified` at the same time and both are true.
   */
  stage: LeadStage;
  /** When to chase. Null when nothing is scheduled. */
  followUpAt: Date | null;
  /** Append-only. Newest last in storage, rendered newest first. */
  notes: LeadNote[];

  callStatus: CallStatus;
  /** How many times a call has been placed. 0 until the first dispatch. */
  attempts: number;
  lastAttemptAt: Date | null;
  /** Populated on failure, shown verbatim in the dashboard. Empty otherwise. */
  failureReason: string;

  /** The provider's handle for the conversation — how the webhook finds us. */
  conversationId: string;
  /** Twilio's call id, when the call went out over Twilio. */
  callSid: string;

  ipHash: string;
  createdAt: Date;
};

type LeadDoc = Omit<Lead, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<LeadDoc>> {
  const db = await getDb();
  const leads = db.collection<LeadDoc>("leads");
  await ensureIndexes(leads);
  return leads;
}

let indexed: Promise<unknown> | null = null;

/**
 * Indexes, created once per process.
 *
 * `conversationId` is the important one: the post-call webhook knows nothing
 * about our document ids, so that field is the only way back to the lead, and
 * it is looked up on every completed call. Partial, because a lead that has not
 * been dispatched yet has no conversation to be found by and indexing thousands
 * of empty strings helps nobody.
 */
function ensureIndexes(leads: Collection<LeadDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    leads.createIndex(
      { conversationId: 1 },
      { partialFilterExpression: { conversationId: { $type: "string", $gt: "" } } },
    ),
    // One lead per human. This is what makes both intake paths find-or-create
    // rather than insert: submit the form twice and you are one person with
    // two calls, which is the entire point of putting a pipeline on a lead.
    leads.createIndex({ phoneKey: 1 }, { unique: true }),
    leads.createIndex({ createdAt: -1 }),
    leads.createIndex({ callStatus: 1, createdAt: -1 }),
    leads.createIndex({ stage: 1, followUpAt: 1 }),
  ]).catch((error) => {
    console.error("[leads] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}

function toLead(doc: LeadDoc & { _id: ObjectId }): Lead {
  return {
    id: doc._id.toHexString(),
    name: doc.name ?? "",
    business: doc.business ?? "",
    phone: doc.phone ?? "",
    phoneKey: doc.phoneKey ?? phoneKey(doc.phone ?? ""),
    email: doc.email ?? "",
    source: doc.source ?? "form",
    stage: doc.stage ?? "new",
    followUpAt: doc.followUpAt ?? null,
    notes: doc.notes ?? [],
    callStatus: doc.callStatus ?? "pending",
    attempts: doc.attempts ?? 0,
    lastAttemptAt: doc.lastAttemptAt ?? null,
    failureReason: doc.failureReason ?? "",
    conversationId: doc.conversationId ?? "",
    callSid: doc.callSid ?? "",
    ipHash: doc.ipHash ?? "",
    createdAt: doc.createdAt ?? new Date(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

/**
 * The person on the other end of a phone number, created if we have not met.
 *
 * Races are settled by the unique index rather than by looking first: two
 * concurrent form submissions from one number would both see "no lead" and
 * both insert. The loser catches the duplicate and re-reads, which is correct
 * under concurrency in a way that check-then-insert never is.
 *
 * An existing lead is never overwritten by a later submission — a returning
 * caller who gives less detail the second time must not erase what we already
 * know. Only genuinely empty fields are filled in.
 */
export async function findOrCreateLeadByPhone(input: {
  name: string;
  business: string;
  phone: string;
  email: string;
  source: LeadSource;
  ipHash: string;
}): Promise<{ lead: Lead; created: boolean }> {
  const key = phoneKey(input.phone);
  if (!key) {
    // An empty key is not "nobody's number" here — it is a unique index value,
    // and the first anonymous caller to hit this would become the permanent
    // home for every caller after them who also withheld their number.
    throw new Error("A lead needs a phone number.");
  }

  const leads = await collection();

  const existing = await leads.findOne({ phoneKey: key });
  if (existing) {
    const fill: Partial<LeadDoc> = {};
    if (!existing.name && input.name) fill.name = input.name;
    if (!existing.business && input.business) fill.business = input.business;
    if (!existing.email && input.email) {
      fill.email = input.email.trim().toLowerCase();
    }

    if (Object.keys(fill).length > 0) {
      await leads.updateOne({ _id: existing._id }, { $set: fill });
    }
    const merged = { ...existing, ...fill } as LeadDoc & { _id: ObjectId };
    return { lead: toLead(merged), created: false };
  }

  const _id = new ObjectId();
  const doc: LeadDoc = {
    _id,
    name: input.name,
    business: input.business,
    phone: input.phone,
    phoneKey: key,
    email: input.email.trim().toLowerCase(),
    source: input.source,
    stage: "new",
    followUpAt: null,
    notes: [],
    callStatus: "pending",
    attempts: 0,
    lastAttemptAt: null,
    failureReason: "",
    conversationId: "",
    callSid: "",
    ipHash: input.ipHash,
    createdAt: new Date(),
  };

  try {
    await leads.insertOne(doc);
    return { lead: toLead(doc as LeadDoc & { _id: ObjectId }), created: true };
  } catch (error) {
    if (isDuplicateKey(error)) {
      // Someone else inserted between our read and our write. Theirs is as
      // good as ours.
      const won = await leads.findOne({ phoneKey: key });
      if (won) return { lead: toLead(won as LeadDoc & { _id: ObjectId }), created: false };
    }
    throw error;
  }
}

/** The provider accepted the call. It has not happened yet — it is ringing. */
export async function recordDispatch(
  id: string,
  result: { conversationId: string; callSid: string },
): Promise<void> {
  const leads = await collection();
  await leads.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        callStatus: "dispatched",
        conversationId: result.conversationId,
        callSid: result.callSid,
        failureReason: "",
        lastAttemptAt: new Date(),
      },
      $inc: { attempts: 1 },
    },
  );
}

/**
 * The call could not be placed.
 *
 * `attempts` still increments for a genuine failure — we did try — but not for
 * `not_configured`, where nothing was sent anywhere and counting it as an
 * attempt would make the dashboard claim we called someone we did not.
 */
export async function recordDispatchFailure(
  id: string,
  reason: string,
  status: Extract<CallStatus, "failed" | "not_configured"> = "failed",
): Promise<void> {
  const leads = await collection();
  await leads.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        callStatus: status,
        failureReason: reason.slice(0, 500),
        lastAttemptAt: new Date(),
      },
      ...(status === "failed" ? { $inc: { attempts: 1 } } : {}),
    },
  );
}

/**
 * Does any lead already claim this conversation?
 *
 * Used to tell inbound from outbound: a conversation id that no lead points to
 * yet did not originate from our own dispatch, so it must be someone calling
 * in.
 */
export async function hasLeadWithConversation(
  conversationId: string,
): Promise<boolean> {
  if (!conversationId) return false;
  const leads = await collection();
  const found = await leads.findOne(
    { conversationId },
    { projection: { _id: 1 } },
  );
  return found !== null;
}

/**
 * A conversation happened, so this lead has been spoken to.
 *
 * `conversationId` is only written when it is currently empty — an inbound
 * lead who calls back later must keep pointing at whichever conversation
 * first claimed it, or `hasLeadWithConversation` starts lying about which
 * calls are new.
 */
export async function markLeadSpokenTo(
  leadId: string,
  conversationId: string,
): Promise<void> {
  if (!ObjectId.isValid(leadId)) return;
  const leads = await collection();
  const _id = new ObjectId(leadId);

  await leads.updateOne(
    { _id },
    { $set: { callStatus: "completed", failureReason: "" } },
  );
  await leads.updateOne(
    { _id, conversationId: "" },
    { $set: { conversationId } },
  );
}

/**
 * What a completed call does to a stage.
 *
 * Pure and exported so the rule can be pinned down without a database. Only
 * `new` moves: a conversation happening is evidence of contact and nothing
 * more, and it must never drag a lead someone marked `won` backwards.
 */
export function nextStage(current: LeadStage): LeadStage {
  return current === "new" ? "contacted" : current;
}

export async function setLeadStage(id: string, stage: LeadStage): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const leads = await collection();
  const result = await leads.updateOne({ _id: new ObjectId(id) }, { $set: { stage } });
  return result.matchedCount > 0;
}

export async function setLeadFollowUp(id: string, at: Date | null): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const leads = await collection();
  const result = await leads.updateOne(
    { _id: new ObjectId(id) },
    { $set: { followUpAt: at } },
  );
  return result.matchedCount > 0;
}

/**
 * Appends a note. There is no edit and no delete, and that is the feature: a
 * pipeline whose history can be quietly rewritten is worth less than one that
 * cannot.
 */
export async function appendLeadNote(
  id: string,
  note: { body: string; author: string },
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const body = note.body.trim().slice(0, 2000);
  if (!body) return false;

  const leads = await collection();
  const result = await leads.updateOne(
    { _id: new ObjectId(id) },
    { $push: { notes: { body, author: note.author, at: new Date() } } },
  );
  return result.matchedCount > 0;
}

export async function advanceStageOnContact(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const leads = await collection();

  const lead = await leads.findOne(
    { _id: new ObjectId(id) },
    { projection: { stage: 1 } },
  );
  if (!lead) return;

  const current: LeadStage = lead.stage ?? "new";
  const next = nextStage(current);
  if (next === current) return;

  // Compare-and-set on the stage we actually read, so a manual change landing
  // between the read and the write wins instead of being clobbered. The rule
  // itself lives in `nextStage` and is called here rather than restated — a
  // rule spelled out twice is a rule that eventually disagrees with itself,
  // and the test would keep passing while this drifted.
  await leads.updateOne(
    { _id: new ObjectId(id), stage: current },
    { $set: { stage: next } },
  );
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

export type LeadFilter = "all" | "attention" | "completed";

const NEEDS_CALL: CallStatus[] = ["pending", "failed", "not_configured"];

/**
 * The one number in the sidebar badge: people who need you today.
 *
 * Never successfully called, or overdue for a chase. Closed leads are excluded
 * — a `won` deal with a stale follow-up date is not work.
 */
function needsAttentionFilter(): Filter<LeadDoc> {
  return {
    stage: { $nin: ["won", "lost"] },
    $or: [
      { callStatus: { $in: NEEDS_CALL } },
      { followUpAt: { $ne: null, $lte: new Date() } },
    ],
  };
}

export async function needsAttentionCount(): Promise<number> {
  const leads = await collection();
  return leads.countDocuments(needsAttentionFilter());
}

function matchFor(filter: LeadFilter): Filter<LeadDoc> {
  if (filter === "attention") return needsAttentionFilter();
  if (filter === "completed") return { callStatus: "completed" };
  return {};
}

/**
 * The Mongo filter behind `listLeads`, factored out and exported so its
 * composition can be pinned down without a database.
 *
 * `needsAttentionFilter` already constrains `stage` (excluding `won`/`lost`),
 * so a caller asking for `attention` *and* a specific stage cannot just have
 * `filter.stage = options.stage` assigned over the top — a bare assignment
 * silently discards the `$nin` exclusion and replaces it with an equality
 * match, which is exactly the kind of thing no test catches until the day a
 * caller actually passes both. `$and` keeps both constraints instead of
 * letting the second overwrite the first.
 */
export function leadFilterFor(options: {
  filter?: LeadFilter;
  stage?: LeadStage;
}): Filter<LeadDoc> {
  const base = matchFor(options.filter ?? "all");
  if (!options.stage) return base;
  if ("stage" in base) return { $and: [base, { stage: options.stage }] };
  return { ...base, stage: options.stage };
}

export async function listLeads(
  options: { filter?: LeadFilter; stage?: LeadStage; limit?: number } = {},
): Promise<Lead[]> {
  const leads = await collection();
  const filter = leadFilterFor(options);

  const docs = await leads
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(options.limit ?? 100, 200))
    .toArray();
  return docs.map((doc) => toLead(doc as LeadDoc & { _id: ObjectId }));
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!ObjectId.isValid(id)) return null;
  const leads = await collection();
  const doc = await leads.findOne({ _id: new ObjectId(id) });
  return doc ? toLead(doc as LeadDoc & { _id: ObjectId }) : null;
}
