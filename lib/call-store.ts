import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import type { CallChannel, CallDirection, TranscriptTurn } from "./call-payload.ts";

/**
 * `calls` — every conversation the agent has had, in either direction.
 *
 * The single home for transcripts. A lead is a person; a call is something
 * that happened to them. Keeping the transcript here rather than on the lead
 * is what lets one person hold several conversations without the record
 * having to decide which of them is "the" transcript.
 *
 * Framework-free like the other stores.
 */

export type Call = {
  id: string;
  /** The provider's handle. Unique — the dedupe key for both write paths. */
  conversationId: string;
  direction: CallDirection;

  /**
   * How the conversation was held — over the phone, or through the browser
   * support widget.
   *
   * Separate from `direction` rather than folded into it, for the reasons in
   * `call-payload.ts`. Every record written before this field existed is a
   * phone call, which is why `toCall` defaults it that way rather than
   * treating the absence as unknown.
   */
  channel: CallChannel;

  counterpartyNumber: string;
  /** Digits only. The join key to a lead. */
  counterpartyKey: string;
  agentId: string;

  /** The person on the other end. Empty only when the caller withheld their number. */
  leadId: string;
  /** Denormalised for the list and for the text index. */
  name: string;

  callSuccessful: "success" | "failure" | "unknown";
  startedAt: Date;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string;

  /** Which path delivered this. Makes a silent webhook failure visible. */
  source: "webhook" | "sync";
  createdAt: Date;
};

export type NewCall = Omit<Call, "id" | "createdAt">;

type CallDoc = Omit<Call, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<CallDoc>> {
  const db = await getDb();
  const calls = db.collection<CallDoc>("calls");
  await ensureIndexes(calls);
  return calls;
}

let indexed: Promise<unknown> | null = null;

/**
 * Indexes, created once per process.
 *
 * The unique one on `conversationId` is the whole reliability design. The
 * webhook and the reconciliation cron both write the same records, and rather
 * than have either check whether the other got there first — a check that is
 * wrong the moment they overlap — the database refuses the second insert.
 * `message-store.ts` earns its IMAP idempotency the same way.
 *
 * `startedAt` and not `createdAt` carries the sort: a call recovered by the
 * cron is inserted long after it happened, and ordering by insertion time
 * would file it under the wrong day.
 */
function ensureIndexes(calls: Collection<CallDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    calls.createIndex({ conversationId: 1 }, { unique: true }),
    calls.createIndex({ startedAt: -1 }),
    calls.createIndex({ direction: 1, startedAt: -1 }),
    calls.createIndex({ channel: 1, startedAt: -1 }),
    calls.createIndex({ leadId: 1, startedAt: -1 }),
    calls.createIndex({ counterpartyKey: 1 }),
    // One text index per collection is a Mongo limit, so this is the only
    // shot: the words someone said, what the agent made of it, and who they
    // are. Weighted so a name match beats a passing mention mid-transcript.
    calls.createIndex(
      { "transcript.message": "text", summary: "text", name: "text" },
      { weights: { name: 10, summary: 4, "transcript.message": 1 }, name: "call_text" },
    ),
  ]).catch((error) => {
    console.error("[calls] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}

function toCall(doc: CallDoc & { _id: ObjectId }): Call {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId ?? "",
    direction: doc.direction === "outbound" ? "outbound" : "inbound",
    // Every row written before this field existed came from a telephone, so an
    // absent value is "phone" rather than unknown — there is no backfill to
    // run and no third state to render.
    channel: doc.channel === "web" ? "web" : "phone",
    counterpartyNumber: doc.counterpartyNumber ?? "",
    counterpartyKey: doc.counterpartyKey ?? "",
    agentId: doc.agentId ?? "",
    leadId: doc.leadId ?? "",
    name: doc.name ?? "",
    callSuccessful: doc.callSuccessful ?? "unknown",
    startedAt: doc.startedAt ?? new Date(),
    durationSeconds: doc.durationSeconds ?? 0,
    transcript: doc.transcript ?? [],
    summary: doc.summary ?? "",
    source: doc.source === "sync" ? "sync" : "webhook",
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

/**
 * Stores a call, or reports that it is already stored.
 *
 * Returns null on a duplicate rather than throwing, because for the cron a
 * duplicate is the expected outcome on every run after the first — it is how
 * "we already have this one" is spelled, not an error.
 */
export async function insertCallIfNew(input: NewCall): Promise<Call | null> {
  const calls = await collection();
  const _id = new ObjectId();
  const doc: CallDoc = { ...input, _id, createdAt: new Date() };

  try {
    await calls.insertOne(doc);
    return toCall(doc as CallDoc & { _id: ObjectId });
  } catch (error) {
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

export async function hasCall(conversationId: string): Promise<boolean> {
  const calls = await collection();
  const found = await calls.findOne(
    { conversationId },
    { projection: { _id: 1 } },
  );
  return found !== null;
}

/**
 * The archive, filtered and searched.
 *
 * A digit-only query bypasses the text index and matches the number by prefix
 * instead. Text search tokenises phone numbers badly, and "find that number"
 * is the second most likely search after "find that word".
 */
export async function listCalls(
  options: {
    direction?: CallDirection;
    channel?: CallChannel;
    query?: string;
    leadId?: string;
    limit?: number;
  } = {},
): Promise<Call[]> {
  const calls = await collection();
  const filter: Filter<CallDoc> = {};

  if (options.direction) filter.direction = options.direction;
  if (options.leadId) filter.leadId = options.leadId;

  if (options.channel === "web") {
    filter.channel = "web";
  } else if (options.channel === "phone") {
    // Matches rows written before the field existed as well as rows that carry
    // it — those are all phone calls, and a bare `{ channel: "phone" }` would
    // hide the entire archive that predates this feature.
    filter.channel = { $ne: "web" };
  }

  const query = options.query?.trim() ?? "";
  const digits = query.replace(/\D/g, "");
  const isNumberSearch = query.length > 0 && digits.length === query.replace(/[\s()+-]/g, "").length && digits.length >= 3;

  if (isNumberSearch) {
    filter.counterpartyKey = { $regex: `^${digits}` };
  } else if (query) {
    filter.$text = { $search: query };
  }

  const limit = Math.min(options.limit ?? 100, 200);

  // Ranked by relevance when searching, by recency otherwise. Sorting a text
  // search by date alone throws away the only thing the index computed.
  const cursor = query && !isNumberSearch
    ? calls
        .find(filter, { projection: { score: { $meta: "textScore" } } })
        .sort({ score: { $meta: "textScore" }, startedAt: -1 })
    : calls.find(filter).sort({ startedAt: -1 });

  const docs = await cursor.limit(limit).toArray();
  return docs.map((doc) => toCall(doc as CallDoc & { _id: ObjectId }));
}

export type CallUsageStats = {
  /** Conversations stored, in the window. */
  conversations: number;
  inbound: number;
  outbound: number;
  /** Talk time as this archive records it, in seconds. */
  talkSeconds: number;
  inboundSeconds: number;
  outboundSeconds: number;
};

/**
 * What this archive knows about talk time, aggregated in the database.
 *
 * Deliberately separate from the provider's own usage figure, and the two are
 * not interchangeable. This counts conversations we actually hold — so it is
 * the number that matches the Calls panel, splits by direction, and keeps
 * working when the provider is unreachable. The provider's `minutes_used` is
 * the billable one: it can include conversations the webhook never delivered
 * and the cron has not yet recovered, and it rounds the way the invoice does.
 * The usage card shows both rather than picking a winner, because a gap
 * between them is itself the useful signal — it means calls are being missed.
 *
 * `$group` rather than reading the rows: talk time over a year of calls is a
 * sum the database can do without sending every transcript across the wire.
 */
export async function callUsageStats(since?: Date): Promise<CallUsageStats> {
  const calls = await collection();
  const match: Filter<CallDoc> = since ? { startedAt: { $gte: since } } : {};

  const rows = await calls
    .aggregate<{ _id: CallDirection; count: number; seconds: number }>([
      { $match: match },
      {
        $group: {
          _id: "$direction",
          count: { $sum: 1 },
          // Guards a legacy or malformed row: `$sum` skips non-numbers, but
          // `$ifNull` keeps an explicit null from poisoning the branch total.
          seconds: { $sum: { $ifNull: ["$durationSeconds", 0] } },
        },
      },
    ])
    .toArray();

  const stats: CallUsageStats = {
    conversations: 0,
    inbound: 0,
    outbound: 0,
    talkSeconds: 0,
    inboundSeconds: 0,
    outboundSeconds: 0,
  };

  for (const row of rows) {
    stats.conversations += row.count;
    stats.talkSeconds += row.seconds;
    if (row._id === "inbound") {
      stats.inbound = row.count;
      stats.inboundSeconds = row.seconds;
    } else if (row._id === "outbound") {
      stats.outbound = row.count;
      stats.outboundSeconds = row.seconds;
    }
  }

  return stats;
}
