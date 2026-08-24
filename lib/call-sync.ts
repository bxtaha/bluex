import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";
import { hasCall } from "./call-store.ts";
import { recordConversation } from "./call-intake.ts";
import { getConversation, isConfigured, listConversations } from "./elevenlabs.ts";

/**
 * Reconciliation.
 *
 * Webhooks get missed — a deploy, a restart, a network blip — and a missed one
 * is silent, which is the problem. This walks recent conversations and stores
 * anything the webhook did not deliver. The unique index does the deciding, so
 * running this while a webhook is arriving is safe.
 *
 * Bounded to one page per run. An unbounded backfill against a paid API is a
 * bill nobody approved, and the cron runs often enough that one page is ample.
 */

const PAGE_SIZE = 50;
const STATE_ID = "callSync";

export type CallSyncResult = { ok: boolean; imported: number; message?: string };

type SyncStateDoc = { _id: string; lastRunAt?: Date; lastError?: string | null };

async function stateCollection(): Promise<Collection<SyncStateDoc>> {
  const db = await getDb();
  return db.collection<SyncStateDoc>("siteSettings");
}

export async function syncCalls(): Promise<CallSyncResult> {
  if (!(await isConfigured())) {
    // Recorded like any other run, not skipped — otherwise the panel keeps
    // showing whatever "last ran" it had before the keys were removed, which
    // reads as the sync still working when it has stopped running at all.
    // `lastError` stays null rather than restating "not configured": that
    // banner already comes from `getCallSyncState`'s own `isConfigured()`
    // check below, and duplicating it here would make one true fact read as
    // two different problems.
    await recordState(null);
    return { ok: false, imported: 0, message: "The voice agent is not configured." };
  }

  const listed = await listConversations(PAGE_SIZE);
  if (!listed.ok) {
    await recordState(listed.reason);
    return { ok: false, imported: 0, message: listed.reason };
  }

  let imported = 0;
  let lastError: string | null = null;

  for (const id of listed.ids) {
    // Cheap check first. Skipping a conversation we already hold avoids paying
    // for a detail fetch on every call in the archive, every ten minutes.
    if (await hasCall(id)) continue;

    const fetched = await getConversation(id);
    if (!fetched.ok) {
      // One bad conversation must not abandon the rest of the page.
      lastError = fetched.reason;
      console.error("[call-sync] could not fetch", id, fetched.reason);
      continue;
    }

    try {
      const result = await recordConversation(fetched.payload, "sync");
      if (result.stored) imported += 1;
    } catch (error) {
      lastError = "Could not store a conversation.";
      console.error("[call-sync] could not store", id, error);
    }
  }

  await recordState(lastError);
  return { ok: true, imported, message: lastError ?? undefined };
}

async function recordState(lastError: string | null): Promise<void> {
  try {
    const collection = await stateCollection();
    await collection.updateOne(
      { _id: STATE_ID },
      { $set: { lastRunAt: new Date(), lastError } },
      { upsert: true },
    );
  } catch (error) {
    // Losing the bookkeeping must not fail the sync that succeeded.
    console.error("[call-sync] could not record state:", error);
  }
}

export async function getCallSyncState(): Promise<{
  lastRunAt: string | null;
  lastError: string | null;
  configured: boolean;
}> {
  let doc: SyncStateDoc | null = null;
  try {
    const collection = await stateCollection();
    doc = await collection.findOne({ _id: STATE_ID });
  } catch (error) {
    console.error("[call-sync] could not read state:", error);
  }

  return {
    lastRunAt: doc?.lastRunAt ? doc.lastRunAt.toISOString() : null,
    lastError: doc?.lastError ?? null,
    configured: await isConfigured(),
  };
}
