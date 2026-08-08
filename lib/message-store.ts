import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * `messages` — every piece of client communication, from either direction and
 * either channel.
 *
 * One collection, not two. A contact-form submission and an email from the same
 * person about the same job are the same conversation, and splitting them by
 * origin means the inbox can never show that. `source` records where a message
 * came in from; `threadId` records what it belongs to; the UI reads both.
 *
 * Framework-free like the other stores, so a scheduled job can import it
 * without a bundler.
 */

export type MessageSource = "contact_form" | "email";
export type MessageDirection = "in" | "out";

/**
 * Read state, per the brief.
 *
 * Archiving is a separate boolean rather than a fourth value here, and that is
 * deliberate: a status can only hold one thing at a time, so folding "archived"
 * into it would destroy the read state of whatever was archived — and an
 * archived thread with an unread message in it is an ordinary thing to have.
 */
export type MessageStatus = "unread" | "read" | "replied";

export type Message = {
  id: string;
  threadId: string;
  source: MessageSource;
  direction: MessageDirection;
  status: MessageStatus;
  archived: boolean;

  name: string;
  email: string;
  subject: string;
  /** Plain text. Always populated — derived from the HTML when mail has no text part. */
  message: string;
  /** Sanitised HTML, or "" when there was none. Never the raw source. */
  html: string;

  /** Contact-form extras. Empty strings for mail. */
  phone: string;
  company: string;
  need: string;

  /** RFC 5322 threading. Empty for contact-form submissions. */
  messageId: string;
  inReplyTo: string;
  references: string[];
  /** Normalised subject, for threading mail that arrives with no References. */
  subjectKey: string;

  ipHash: string;
  createdAt: Date;
};

type MessageDoc = Omit<Message, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<MessageDoc>> {
  const db = await getDb();
  const messages = db.collection<MessageDoc>("messages");
  await ensureIndexes(messages);
  return messages;
}

let indexed: Promise<unknown> | null = null;

/**
 * Indexes, created once per process.
 *
 * The unique index on `messageId` is what makes IMAP sync idempotent: two runs
 * overlapping, or a mailbox re-delivering, collide on insert rather than
 * duplicating the conversation. It is *partial* because contact-form
 * submissions have no Message-ID, and a plain unique index would let exactly
 * one of them exist.
 */
function ensureIndexes(messages: Collection<MessageDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    messages.createIndex(
      { messageId: 1 },
      {
        unique: true,
        partialFilterExpression: { messageId: { $type: "string", $gt: "" } },
      },
    ),
    messages.createIndex({ threadId: 1, createdAt: 1 }),
    messages.createIndex({ createdAt: -1 }),
    messages.createIndex({ subjectKey: 1, email: 1 }),
  ]).catch((error) => {
    console.error("[messages] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}

function toMessage(doc: MessageDoc & { _id: ObjectId }): Message {
  return {
    id: doc._id.toHexString(),
    threadId: doc.threadId,
    source: doc.source === "email" ? "email" : "contact_form",
    direction: doc.direction === "out" ? "out" : "in",
    status: doc.status ?? "unread",
    archived: Boolean(doc.archived),
    name: doc.name ?? "",
    email: doc.email ?? "",
    subject: doc.subject ?? "",
    message: doc.message ?? "",
    html: doc.html ?? "",
    phone: doc.phone ?? "",
    company: doc.company ?? "",
    need: doc.need ?? "",
    messageId: doc.messageId ?? "",
    inReplyTo: doc.inReplyTo ?? "",
    references: doc.references ?? [],
    subjectKey: doc.subjectKey ?? "",
    ipHash: doc.ipHash ?? "",
    createdAt: doc.createdAt ?? new Date(),
  };
}

/**
 * Strips the reply and forward prefixes a subject accumulates.
 *
 * Every mail client localises its own — `Re:`, `RE:`, `Fwd:`, `SV:`, `AW:` —
 * and they stack. This is the key the subject-matching fallback groups on, so
 * two messages that differ only by how many clients have quoted them land
 * together.
 */
export function subjectKey(subject: string): string {
  return subject
    .replace(/^(\s*(re|fw|fwd|aw|sv|vs|antwort|res)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

const BLANK: Omit<Message, "id" | "threadId" | "createdAt"> = {
  source: "contact_form",
  direction: "in",
  status: "unread",
  archived: false,
  name: "",
  email: "",
  subject: "",
  message: "",
  html: "",
  phone: "",
  company: "",
  need: "",
  messageId: "",
  inReplyTo: "",
  references: [],
  subjectKey: "",
  ipHash: "",
};

type NewMessage = Partial<Omit<Message, "id" | "threadId" | "createdAt">> & {
  /** Omit to start a new thread rooted at the inserted document. */
  threadId?: string;
  createdAt?: Date;
};

async function insert(input: NewMessage): Promise<Message> {
  const messages = await collection();
  const _id = new ObjectId();

  const doc: MessageDoc = {
    ...BLANK,
    ...input,
    _id,
    // Lower-cased on the way in, because it is a lookup key: the subject-match
    // fallback in `resolveThreadId` compares addresses, and mail servers are
    // entirely willing to send the same person as `Ada@` and `ada@`.
    email: (input.email ?? "").trim().toLowerCase(),
    // A message that starts a conversation *is* the conversation, so its own id
    // is the thread's. That keeps thread ids opaque and collision-free without
    // a second generator.
    threadId: input.threadId || _id.toHexString(),
    subjectKey: input.subjectKey ?? subjectKey(input.subject ?? ""),
    createdAt: input.createdAt ?? new Date(),
  };

  await messages.insertOne(doc);
  return toMessage(doc as MessageDoc & { _id: ObjectId });
}

/** A submission from the site's contact form. */
export async function createContactMessage(input: {
  name: string;
  email: string;
  phone: string;
  company: string;
  need: string;
  message: string;
  ipHash: string;
}): Promise<Message> {
  return insert({
    ...input,
    source: "contact_form",
    direction: "in",
    status: "unread",
    subject: `Contact form — ${input.name}`,
  });
}

/**
 * A message pulled from IMAP.
 *
 * Returns null when it is already stored. The caller does not need to check
 * first: the unique index decides, which is the only check that stays correct
 * when two syncs overlap.
 */
export async function insertIncomingEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  html: string;
  messageId: string;
  inReplyTo: string;
  references: string[];
  createdAt: Date;
}): Promise<Message | null> {
  const key = subjectKey(input.subject);
  const threadId = await resolveThreadId(
    [...input.references, input.inReplyTo].filter(Boolean),
    key,
    input.email,
  );

  try {
    return await insert({
      ...input,
      source: "email",
      direction: "in",
      status: "unread",
      subjectKey: key,
      threadId: threadId ?? undefined,
    });
  } catch (error) {
    // 11000 is a duplicate key — this message is already in the collection,
    // which is the expected outcome on every sync after the first.
    if (isDuplicateKey(error)) return null;
    throw error;
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Which conversation a newly arrived mail belongs to.
 *
 * `References` first, because it is the only signal that is actually reliable —
 * it is a machine-maintained chain and it survives a renamed subject. Subject
 * matching is the fallback for clients that drop the header, and it is
 * deliberately narrowed to the same correspondent: two unrelated people writing
 * "Quote?" are not one thread.
 */
async function resolveThreadId(
  candidates: string[],
  key: string,
  address: string,
): Promise<string | null> {
  const messages = await collection();

  if (candidates.length > 0) {
    const parent = await messages.findOne(
      { messageId: { $in: candidates } },
      { projection: { threadId: 1 } },
    );
    if (parent?.threadId) return parent.threadId;
  }

  if (key && address) {
    const sibling = await messages.findOne(
      { subjectKey: key, email: address.toLowerCase() },
      { projection: { threadId: 1 }, sort: { createdAt: -1 } },
    );
    if (sibling?.threadId) return sibling.threadId;
  }

  return null;
}

/** A reply we sent. Marks the rest of the thread replied in the same pass. */
export async function recordReply(input: {
  threadId: string;
  to: string;
  subject: string;
  message: string;
  messageId: string;
  inReplyTo: string;
  references: string[];
  source: MessageSource;
}): Promise<Message> {
  const reply = await insert({
    threadId: input.threadId,
    source: input.source,
    direction: "out",
    status: "replied",
    email: input.to,
    subject: input.subject,
    message: input.message,
    messageId: input.messageId,
    inReplyTo: input.inReplyTo,
    references: input.references,
  });

  await setThreadStatus(input.threadId, "replied");
  return reply;
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

export type ThreadFilter = "all" | "unread" | "contact_form" | "email";

export type ThreadSummary = {
  id: string;
  subject: string;
  name: string;
  email: string;
  source: MessageSource;
  snippet: string;
  lastAt: Date;
  count: number;
  unread: number;
  archived: boolean;
};

function matchFor(filter: ThreadFilter, archived: boolean): Filter<MessageDoc> {
  const match: Filter<MessageDoc> = archived
    ? { archived: true }
    : { archived: { $ne: true } };

  if (filter === "contact_form" || filter === "email") match.source = filter;
  return match;
}

/**
 * The thread list.
 *
 * Grouped in the database rather than in JS. Pulling every message back to
 * fold them in the route would mean the whole mailbox crosses the wire on every
 * page load; this returns one row per conversation.
 *
 * The sort is descending, so `$first` is the newest message in a thread (its
 * snippet and timestamp) and `$last` is the oldest (who started it, and what
 * they called it). "Unread" filters on the grouped count, not on individual
 * messages — a thread is unread if anything in it is.
 */
export async function listThreads(options: {
  filter?: ThreadFilter;
  archived?: boolean;
  limit?: number;
} = {}): Promise<ThreadSummary[]> {
  const filter = options.filter ?? "all";
  const messages = await collection();

  const rows = await messages
    .aggregate<{
      _id: string;
      subject: string;
      name: string;
      email: string;
      source: MessageSource;
      snippet: string;
      lastAt: Date;
      count: number;
      unread: number;
      archived: number;
    }>([
      { $match: matchFor(filter, options.archived ?? false) },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$threadId",
          lastAt: { $first: "$createdAt" },
          snippet: { $first: "$message" },
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$status", "unread"] }, 1, 0] },
          },
          archived: { $max: { $cond: ["$archived", 1, 0] } },
          subject: { $last: "$subject" },
          name: { $last: "$name" },
          email: { $last: "$email" },
          source: { $last: "$source" },
        },
      },
      ...(filter === "unread" ? [{ $match: { unread: { $gt: 0 } } }] : []),
      { $sort: { lastAt: -1 } },
      { $limit: Math.min(options.limit ?? 100, 200) },
    ])
    .toArray();

  return rows.map((row) => ({
    id: row._id,
    subject: row.subject || "(no subject)",
    name: row.name || row.email || "Unknown",
    email: row.email || "",
    source: row.source === "email" ? "email" : "contact_form",
    // Trimmed here rather than in the component: the point of a snippet is that
    // the rest of the body never leaves the database.
    snippet: (row.snippet || "").replace(/\s+/g, " ").trim().slice(0, 160),
    lastAt: row.lastAt,
    count: row.count,
    unread: row.unread,
    archived: row.archived === 1,
  }));
}

/** Every message in one conversation, oldest first. */
export async function getThread(threadId: string): Promise<Message[]> {
  const messages = await collection();
  const docs = await messages
    .find({ threadId })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();
  return docs.map((doc) => toMessage(doc as MessageDoc & { _id: ObjectId }));
}

/** Threads with something unread in them. Drives the sidebar badge. */
export async function unreadThreadCount(): Promise<number> {
  const messages = await collection();
  const ids = await messages.distinct("threadId", {
    status: "unread",
    archived: { $ne: true },
  });
  return ids.length;
}

/* ── Thread-level mutations ──────────────────────────────────────────────── */

/**
 * Read state is only ever set on inbound messages.
 *
 * Marking our own replies "unread" would put a thread back in the badge because
 * we answered it, which is the opposite of what the badge is for.
 */
export async function setThreadStatus(
  threadId: string,
  status: MessageStatus,
): Promise<boolean> {
  const messages = await collection();
  const result = await messages.updateMany(
    { threadId, direction: "in" },
    { $set: { status } },
  );
  return result.matchedCount > 0;
}

export async function setThreadArchived(
  threadId: string,
  archived: boolean,
): Promise<boolean> {
  const messages = await collection();
  const result = await messages.updateMany({ threadId }, { $set: { archived } });
  return result.matchedCount > 0;
}

/**
 * The message a reply should be addressed to and threaded under: the most
 * recent inbound one.
 */
export async function lastInboundInThread(
  threadId: string,
): Promise<Message | null> {
  const messages = await collection();
  const doc = await messages.findOne(
    { threadId, direction: "in" },
    { sort: { createdAt: -1 } },
  );
  return doc ? toMessage(doc as MessageDoc & { _id: ObjectId }) : null;
}
