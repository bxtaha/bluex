import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";
import { DEFAULT_CONTACT_EMAIL } from "./mail-config.ts";

/**
 * The three pieces of the contact section an admin can change: the address, the
 * WhatsApp number, and the paragraph above them.
 *
 * One document rather than a collection of rows — there is exactly one contact
 * section, and a fixed `_id` means the read is a primary-key lookup and the
 * write is an upsert that cannot accidentally create a second one.
 *
 * Framework-free, like the other `*-store` files, so it stays importable from
 * plain Node. `lib/contact.ts` adds the Next cache layer.
 */

export type ContactSettings = {
  email: string;
  /** As typed, for display: "+880 1712 345678". */
  whatsapp: string;
  intro: string;
};

type ContactDoc = ContactSettings & { _id: string };

const DOC_ID = "contact";

export const DEFAULT_CONTACT: ContactSettings = {
  email: DEFAULT_CONTACT_EMAIL,
  whatsapp: "",
  intro:
    "If you want to hear the agent, use the call button — it rings you in five minutes. If you'd rather write, this reaches the same place.",
};

async function collection(): Promise<Collection<ContactDoc>> {
  const db = await getDb();
  return db.collection<ContactDoc>("siteSettings");
}

function toSettings(doc: Partial<ContactDoc> | null): ContactSettings {
  return {
    email: doc?.email?.trim() || DEFAULT_CONTACT.email,
    whatsapp: doc?.whatsapp?.trim() ?? DEFAULT_CONTACT.whatsapp,
    intro: doc?.intro?.trim() || DEFAULT_CONTACT.intro,
  };
}

/** Raw read, uncached. `lib/contact.ts` wraps this for the public section. */
export async function readContactSettingsUncached(): Promise<ContactSettings> {
  const doc = await (await collection()).findOne({ _id: DOC_ID });
  return toSettings(doc);
}

export type ContactSettingsInput = Partial<ContactSettings>;

function sanitise(input: ContactSettingsInput): ContactSettingsInput {
  const out: ContactSettingsInput = {};
  if (typeof input.email === "string") out.email = input.email.trim().slice(0, 160);
  if (typeof input.whatsapp === "string") {
    out.whatsapp = input.whatsapp.trim().slice(0, 40);
  }
  if (typeof input.intro === "string") out.intro = input.intro.trim().slice(0, 600);
  return out;
}

export async function updateContactSettings(
  input: ContactSettingsInput,
): Promise<ContactSettings> {
  const patch = sanitise(input);
  const updated = await (await collection()).findOneAndUpdate(
    { _id: DOC_ID },
    { $set: patch, $setOnInsert: { _id: DOC_ID } },
    { upsert: true, returnDocument: "after" },
  );
  return toSettings(updated);
}
