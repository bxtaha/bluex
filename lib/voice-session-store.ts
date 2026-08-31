import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";
import type { VisitorLocation } from "./visitor-location.ts";

/**
 * Where a browser conversation started, waiting for the conversation to arrive.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * This collection exists because the two facts are separated by time and by
 * sender. When a visitor's browser asks for a session we know roughly where
 * they are and nothing about what they will say; when the conversation is
 * filed, minutes later, it arrives from the *provider's* servers and carries
 * no trace of the visitor's connection at all.
 *
 * `include_conversation_id=true` on the signed-URL request is what makes the
 * join possible: it hands back the id the webhook will later quote, so the
 * location can be written down under a key that the conversation will bring
 * with it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **The visitor's address is not here.** It was resolved and dropped in the
 * request that created this row — see `lib/visitor-location.ts`. What is stored
 * is a country, a subdivision code and a city.
 *
 * The `_id` is the conversation id rather than a generated one, so the join is
 * a primary-key read and a second write for the same conversation is an upsert
 * rather than a duplicate.
 */

type VoiceSessionDoc = {
  _id: string;
  location: VisitorLocation;
  /** TTL target — Mongo reaps the row once this passes. */
  createdAt: Date;
};

async function collection(): Promise<Collection<VoiceSessionDoc>> {
  const db = await getDb();
  const sessions = db.collection<VoiceSessionDoc>("voiceSessions");
  await ensureIndexes(sessions);
  return sessions;
}

let indexed: Promise<unknown> | null = null;

/**
 * Seven days, and the number is chosen rather than round.
 *
 * The webhook normally arrives within seconds, so a few minutes would cover the
 * happy path. What it would not cover is the reconciliation cron, which exists
 * precisely to recover conversations the webhook never delivered — sometimes
 * hours or days later. A row that expired before the cron ran would leave those
 * recovered conversations permanently locationless, which is the exact failure
 * the cron exists to prevent.
 *
 * This is garbage collection, not a privacy control. There is nothing
 * identifying in the row to expire.
 */
const TTL_SECONDS = 7 * 24 * 60 * 60;

function ensureIndexes(sessions: Collection<VoiceSessionDoc>): Promise<unknown> {
  indexed ??= sessions
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS })
    .catch((error) => {
      // A missing TTL index means rows accumulate. It does not mean the join is
      // wrong, so this is logged rather than thrown — the same call it is
      // reached from must still be able to start a conversation.
      console.error("[voice-sessions] could not create the TTL index:", error);
      indexed = null;
    });
  return indexed;
}

/**
 * Records where a conversation is about to start from.
 *
 * Never throws. This is called from the path between a visitor clicking a
 * button and talking to an agent; losing a city is an acceptable outcome there
 * and refusing the conversation is not.
 */
export async function rememberVoiceSession(
  conversationId: string,
  location: VisitorLocation,
): Promise<void> {
  if (!conversationId) return;

  try {
    const sessions = await collection();
    await sessions.updateOne(
      { _id: conversationId },
      { $set: { location, createdAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    console.error("[voice-sessions] could not record the session location:", error);
  }
}

/**
 * The location for a conversation, if one was recorded.
 *
 * **Non-destructive on purpose.** Consuming the row would lose the location
 * whenever an intake failed after reading it — and intake can fail, which is
 * why the webhook returns 5xx and the provider retries. The TTL handles
 * cleanup, so there is nothing to gain by deleting here and a recoverable
 * failure to lose.
 */
export async function readVoiceSessionLocation(
  conversationId: string,
): Promise<VisitorLocation | null> {
  if (!conversationId) return null;

  try {
    const sessions = await collection();
    const found = await sessions.findOne({ _id: conversationId });
    return found?.location ?? null;
  } catch (error) {
    console.error("[voice-sessions] could not read the session location:", error);
    return null;
  }
}
