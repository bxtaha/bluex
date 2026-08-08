import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import type { Collection } from "mongodb";
import { imapConfig } from "./mail-config.ts";
import { getDb } from "./mongodb.ts";
import { insertIncomingEmail } from "./message-store.ts";
import { htmlToText, sanitiseMailHtml } from "./sanitise-mail.ts";

/**
 * Pulls new mail from Hostinger into the `messages` collection.
 *
 * **Polled, not IDLE.** IMAP IDLE holds a socket open and waits to be told
 * about new mail, which is lovely on a machine that stays up and useless here:
 * this app runs as a container that can be restarted or scaled, and a
 * long-lived connection per instance either dies quietly or multiplies. A
 * scheduled fetch every few minutes is a request that either worked or did
 * not, and "did not" is visible.
 *
 * Two things keep repeated runs safe. The unique index on `messageId` makes
 * inserting the same mail twice a no-op, so an overlapping run cannot duplicate
 * a conversation; and a UID watermark means the usual run fetches nothing at
 * all rather than re-downloading the mailbox.
 */

type SyncState = {
  _id: string;
  /** Highest UID already stored. UIDs ascend and are never reused... */
  lastUid: number;
  /** ...within one `uidValidity`. When the server changes it, they are. */
  uidValidity: string;
  lastRunAt: Date;
  lastError?: string;
};

const STATE_ID = "imap:inbox";

/** A first sync reads back this far rather than the whole mailbox. */
const FIRST_RUN_DAYS = 30;

/** Ceiling per run, so one call cannot run for minutes. */
const MAX_PER_RUN = 60;

async function states(): Promise<Collection<SyncState>> {
  const db = await getDb();
  return db.collection<SyncState>("syncState");
}

export type SyncResult = {
  ok: boolean;
  /** Newly stored messages. Zero is the normal, healthy answer. */
  imported: number;
  /** Already present — a fetch overlap, not a problem. */
  skipped: number;
  message?: string;
};

export async function getSyncState(): Promise<{
  lastRunAt: Date | null;
  lastError: string | null;
  configured: boolean;
}> {
  const configured = imapConfig() !== null;
  try {
    const doc = await (await states()).findOne({ _id: STATE_ID });
    return {
      lastRunAt: doc?.lastRunAt ?? null,
      lastError: doc?.lastError ?? null,
      configured,
    };
  } catch {
    return { lastRunAt: null, lastError: null, configured };
  }
}

/**
 * The first address in a header, as a name and an address.
 *
 * `mailparser` hands back either one object or an array depending on the
 * header, and the value is missing entirely on malformed mail — which arrives
 * regularly, because spam is not written carefully.
 */
function firstAddress(
  value: AddressObject | AddressObject[] | undefined,
): { name: string; address: string } {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  for (const entry of list) {
    const first = entry.value?.[0];
    if (first?.address) {
      return { name: first.name?.trim() || "", address: first.address.trim() };
    }
  }
  return { name: "", address: "" };
}

/** `<a@b>` — the angle brackets are part of the header, not of the identifier. */
function normaliseIds(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((entry) => entry.split(/\s+/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function syncInbox(): Promise<SyncResult> {
  const config = imapConfig();
  if (!config) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      message: "IMAP is not configured. Set IMAP_USER and IMAP_PASS.",
    };
  }

  const stateCollection = await states();
  const state = await stateCollection.findOne({ _id: STATE_ID });

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    // imapflow logs every protocol exchange at info level by default, which
    // includes the AUTHENTICATE line. Off.
    logger: false,
  });

  let imported = 0;
  let skipped = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.mailbox);

    try {
      const mailbox = client.mailbox;
      const uidValidity =
        typeof mailbox === "object" && mailbox
          ? String(mailbox.uidValidity ?? "")
          : "";

      // A changed `uidValidity` means the server has renumbered the mailbox and
      // every stored UID now refers to something else — or to nothing. The only
      // safe reading of the watermark is that there isn't one.
      const continuous =
        state?.uidValidity === uidValidity && (state?.lastUid ?? 0) > 0;

      const range = continuous
        ? `${(state?.lastUid ?? 0) + 1}:*`
        : undefined;

      const uids = continuous
        ? await client.search({ uid: range! }, { uid: true })
        : await client.search(
            { since: new Date(Date.now() - FIRST_RUN_DAYS * 86_400_000) },
            { uid: true },
          );

      // `uid: "n:*"` always returns at least the highest message even when
      // nothing is newer than n, so the watermark itself has to be excluded.
      const fresh = (uids || [])
        .filter((uid) => !continuous || uid > (state?.lastUid ?? 0))
        .sort((a, b) => a - b)
        .slice(0, MAX_PER_RUN);

      let highest = state?.lastUid ?? 0;

      for (const uid of fresh) {
        highest = Math.max(highest, uid);

        const item = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!item || !item.source) continue;

        const parsed = await simpleParser(item.source);
        const from = firstAddress(parsed.from);
        if (!from.address) {
          // No usable sender: nothing to thread it to and nothing to reply to.
          skipped += 1;
          continue;
        }

        // Sanitised before it is stored, never after — see `sanitise-mail.ts`.
        const html = sanitiseMailHtml(parsed.html || "");
        const text = (parsed.text || "").trim() || htmlToText(html);

        const stored = await insertIncomingEmail({
          name: from.name,
          email: from.address,
          subject: parsed.subject?.trim() || "(no subject)",
          message: text,
          html,
          messageId: parsed.messageId?.trim() || "",
          inReplyTo: normaliseIds(parsed.inReplyTo)[0] ?? "",
          references: normaliseIds(parsed.references),
          createdAt: parsed.date ?? new Date(),
        });

        if (stored) imported += 1;
        else skipped += 1;
      }

      await stateCollection.updateOne(
        { _id: STATE_ID },
        {
          $set: {
            lastUid: highest,
            uidValidity,
            lastRunAt: new Date(),
            lastError: "",
          },
        },
        { upsert: true },
      );
    } finally {
      lock.release();
    }

    return { ok: true, imported, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[imap] sync failed:", message);

    // Recorded rather than only logged, so the dashboard can show why the
    // inbox looks stale instead of silently showing nothing new.
    await stateCollection
      .updateOne(
        { _id: STATE_ID },
        { $set: { lastRunAt: new Date(), lastError: message } },
        { upsert: true },
      )
      .catch(() => {});

    return { ok: false, imported, skipped, message };
  } finally {
    // `logout` is the polite close; if the socket is already gone it throws,
    // and a failure to hang up is not a failure to sync.
    await client.logout().catch(() => {});
  }
}
