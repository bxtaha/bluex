import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
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

export type TranscriptTurn = {
  role: "agent" | "user";
  message: string;
  /** Seconds from the start of the call. Drives the transcript's left gutter. */
  at: number;
};

export type Lead = {
  id: string;

  name: string;
  business: string;
  phone: string;
  email: string;
  source: LeadSource;

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

  /* ── Filled in by the post-call webhook ──────────────────────────────── */
  transcript: TranscriptTurn[];
  summary: string;
  durationSeconds: number;
  /** The provider's own verdict on whether the call achieved its goal. */
  callSuccessful: "success" | "failure" | "unknown";
  endedAt: Date | null;

  ipHash: string;
  createdAt: Date;

  /**
   * Reserved for the client portal.
   *
   * A client is a customer who will eventually see their own leads and call
   * transcripts, and this is the field that association will hang from. It is
   * declared now so adding the feature is not also a migration.
   *
   * Deliberately nothing more than a declaration: nothing writes it, and there
   * is no index for it. An index on a field no query touches is dead weight, and
   * a field nothing populates is not a half-built feature — it is a note about
   * where the next one goes. Add both together, when there is a query.
   */
  clientId?: string;
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
    leads.createIndex({ createdAt: -1 }),
    leads.createIndex({ callStatus: 1, createdAt: -1 }),
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
    email: doc.email ?? "",
    source: doc.source === "inline" ? "inline" : "form",
    callStatus: doc.callStatus ?? "pending",
    attempts: doc.attempts ?? 0,
    lastAttemptAt: doc.lastAttemptAt ?? null,
    failureReason: doc.failureReason ?? "",
    conversationId: doc.conversationId ?? "",
    callSid: doc.callSid ?? "",
    transcript: doc.transcript ?? [],
    summary: doc.summary ?? "",
    durationSeconds: doc.durationSeconds ?? 0,
    callSuccessful: doc.callSuccessful ?? "unknown",
    endedAt: doc.endedAt ?? null,
    ipHash: doc.ipHash ?? "",
    createdAt: doc.createdAt ?? new Date(),
  };
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

/**
 * Records a lead. Called before any attempt to reach them, so that a lead
 * exists even when every downstream service is down.
 */
export async function createLead(input: {
  name: string;
  business: string;
  phone: string;
  email: string;
  source: LeadSource;
  ipHash: string;
}): Promise<Lead> {
  const leads = await collection();
  const _id = new ObjectId();

  const doc: LeadDoc = {
    _id,
    name: input.name,
    business: input.business,
    phone: input.phone,
    // Lower-cased on the way in for the same reason the inbox does it: it is a
    // lookup key, and the same person will send it capitalised half the time.
    email: input.email.trim().toLowerCase(),
    source: input.source,
    callStatus: "pending",
    attempts: 0,
    lastAttemptAt: null,
    failureReason: "",
    conversationId: "",
    callSid: "",
    transcript: [],
    summary: "",
    durationSeconds: 0,
    callSuccessful: "unknown",
    endedAt: null,
    ipHash: input.ipHash,
    createdAt: new Date(),
  };

  await leads.insertOne(doc);
  return toLead(doc as LeadDoc & { _id: ObjectId });
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
 * The call finished. Keyed by conversation id, because that is all the webhook
 * carries — see the index note above.
 *
 * Returns false when no lead matches, which is not an error worth a 500: the
 * agent can be dialled from the provider's own dashboard for testing, and those
 * calls have no lead here.
 */
export async function recordCallOutcome(
  conversationId: string,
  outcome: {
    transcript: TranscriptTurn[];
    summary: string;
    durationSeconds: number;
    callSuccessful: Lead["callSuccessful"];
  },
): Promise<boolean> {
  const leads = await collection();
  const result = await leads.updateOne(
    { conversationId },
    {
      $set: {
        callStatus: "completed",
        transcript: outcome.transcript,
        summary: outcome.summary,
        durationSeconds: outcome.durationSeconds,
        callSuccessful: outcome.callSuccessful,
        endedAt: new Date(),
      },
    },
  );
  return result.matchedCount > 0;
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

export type LeadFilter = "all" | "attention" | "completed";

/**
 * The states that mean a human should look.
 *
 * Shared by the list filter and the sidebar badge so the badge can never count
 * a different set from the one clicking it shows.
 */
const NEEDS_ATTENTION: CallStatus[] = ["pending", "failed", "not_configured"];

function matchFor(filter: LeadFilter): Filter<LeadDoc> {
  if (filter === "attention") return { callStatus: { $in: NEEDS_ATTENTION } };
  if (filter === "completed") return { callStatus: "completed" };
  return {};
}

export async function listLeads(
  options: { filter?: LeadFilter; limit?: number } = {},
): Promise<Lead[]> {
  const leads = await collection();
  const docs = await leads
    .find(matchFor(options.filter ?? "all"))
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

/** Leads nobody has successfully reached. Drives the sidebar badge. */
export async function attentionLeadCount(): Promise<number> {
  const leads = await collection();
  return leads.countDocuments({ callStatus: { $in: NEEDS_ATTENTION } });
}
