import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * A fixed-window rate limiter, in MongoDB.
 *
 * Not a `Map` in module scope. That version works perfectly on one long-lived
 * dev server and does nothing in production: `output: "standalone"` behind a
 * restart, or a second container, gives an attacker a fresh empty counter for
 * free. The whole point of a limiter is that it is shared, so it lives where
 * the shared state already is.
 *
 * Fixed window, not sliding: a sliding window means storing every hit, and the
 * worst case of a fixed one is that someone gets 2×limit across a boundary.
 * For "stop a spam flood" that is a rounding error, and this stays one document
 * per key.
 */

type RateLimitDoc = {
  _id: string;
  count: number;
  /** TTL index target — Mongo reaps the document once this passes. */
  expiresAt: Date;
};

async function collection(): Promise<Collection<RateLimitDoc>> {
  const db = await getDb();
  const rateLimits = db.collection<RateLimitDoc>("rateLimits");
  await ensureIndex(rateLimits);
  return rateLimits;
}

let indexed: Promise<unknown> | null = null;

/** Created once per process, not once per call. */
function ensureIndex(rateLimits: Collection<RateLimitDoc>): Promise<unknown> {
  indexed ??= rateLimits
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((error) => {
      // A missing TTL index means documents accumulate; it does not mean the
      // limiter is wrong, because expiry is checked at read time below too.
      console.error("[rate-limit] could not create TTL index:", error);
      indexed = null;
    });
  return indexed;
}

export type RateLimitResult = {
  allowed: boolean;
  /** How many of the window's allowance are left after this call. */
  remaining: number;
  resetAt: Date;
};

/**
 * Counts one hit against `key` and says whether it is allowed.
 *
 * Fails **open**. If Mongo is unreachable the contact form is already going to
 * fail at the storage step with a message the visitor can act on; refusing them
 * here as well would turn a database blip into "you look like a bot".
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const rateLimits = await collection();

    // Mongo's TTL monitor only runs about once a minute, so an expired window
    // can still be sitting there. Reset it first rather than trusting the
    // sweeper to have been punctual.
    await rateLimits.updateOne(
      { _id: key, expiresAt: { $lte: now } },
      { $set: { count: 0, expiresAt: resetAt } },
    );

    const doc = await rateLimits.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: resetAt } },
      { upsert: true, returnDocument: "after" },
    );

    const count = doc?.count ?? 1;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: doc?.expiresAt ?? resetAt,
    };
  } catch (error) {
    console.error("[rate-limit] unavailable, allowing:", error);
    return { allowed: true, remaining: limit, resetAt };
  }
}
