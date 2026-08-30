import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";
import {
  DEFAULT_SUPPORT_VOICE,
  validateSupportVoice,
  type StoredSupportVoice,
  type SupportVoicePatch,
  type SupportVoiceUpdateResult,
} from "./support-voice-schema.ts";

/**
 * Where the support agent's settings live.
 *
 * One document in `siteSettings` under a fixed `_id`, the same shape as
 * `contact-store.ts` and `voice-settings.ts` — there is exactly one support
 * configuration, and a fixed id makes every write an upsert that cannot create
 * a second one.
 *
 * Deliberately thin. Everything that decides what is *valid* is in
 * `support-voice-schema.ts`, which imports nothing that opens a socket and is
 * therefore testable; this file only moves the result in and out of Mongo.
 */

const DOC_ID = "supportVoice";

type SupportVoiceDoc = Partial<StoredSupportVoice> & { _id: string };

async function collection(): Promise<Collection<SupportVoiceDoc>> {
  const db = await getDb();
  return db.collection<SupportVoiceDoc>("siteSettings");
}

/**
 * Reads the document, filling anything absent from the defaults.
 *
 * The spread is not defensive habit. A document written before a field existed
 * simply does not have it, and every consumer here types the result as a
 * complete `StoredSupportVoice` — TypeScript cannot see the gap because it
 * types the read from today's source while the value came from an older
 * write. The identical omission on the contact settings took the whole home
 * page down with "Cannot read properties of undefined" when `phone` was added.
 */
export async function readSupportVoiceUncached(): Promise<StoredSupportVoice> {
  const doc = await (await collection()).findOne({ _id: DOC_ID });
  if (!doc) return DEFAULT_SUPPORT_VOICE;

  const { _id, ...stored } = doc;
  void _id;

  return {
    ...DEFAULT_SUPPORT_VOICE,
    ...stored,
    // The one field the spread cannot fix: an array written by an older
    // version could be absent, and `[] ?? default` is not the same as
    // `undefined ?? default`.
    visibilityPaths: Array.isArray(stored.visibilityPaths)
      ? stored.visibilityPaths
      : DEFAULT_SUPPORT_VOICE.visibilityPaths,
  };
}

/**
 * Applies a partial update.
 *
 * Partial throughout: a caller sending `{ enabled: false }` must not reset the
 * agent id as a side effect, which is why the validated result carries only the
 * keys that were actually present rather than a whole settings object with
 * defaults filled in.
 */
export async function updateSupportVoice(
  patch: SupportVoicePatch,
): Promise<SupportVoiceUpdateResult> {
  const validated = validateSupportVoice(patch);
  if (!validated.ok) return { ok: false, message: validated.message };

  if (Object.keys(validated.value).length > 0) {
    await (await collection()).updateOne(
      { _id: DOC_ID },
      { $set: validated.value, $setOnInsert: { _id: DOC_ID } },
      { upsert: true },
    );
  }

  return { ok: true, settings: await readSupportVoiceUncached() };
}
