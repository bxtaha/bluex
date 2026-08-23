/**
 * Backfills the fields added when leads became people.
 *
 * Idempotent — it only touches documents actually missing a field, so running
 * it twice changes nothing the second time. Safe to run against production
 * before deploying the code that needs these fields, which is the order that
 * avoids a window where the app reads documents it cannot understand.
 */
import { getDb } from "../lib/mongodb.ts";
import { phoneKey } from "../lib/call-payload.ts";

const db = await getDb();
const leads = db.collection("leads");

let keyed = 0;
for await (const doc of leads.find({ phoneKey: { $exists: false } })) {
  await leads.updateOne(
    { _id: doc._id },
    { $set: { phoneKey: phoneKey(String(doc.phone ?? "")) } },
  );
  keyed += 1;
}

const defaults = await leads.updateMany(
  { stage: { $exists: false } },
  { $set: { stage: "new", followUpAt: null, notes: [] } },
);

// The transcript fields moved to `calls`. Leaving them would be dead weight on
// every read of every lead forever.
const stripped = await leads.updateMany(
  {},
  {
    $unset: {
      transcript: "",
      summary: "",
      durationSeconds: "",
      callSuccessful: "",
      endedAt: "",
    },
  },
);

console.log(
  `phoneKey set on ${keyed}; pipeline defaults on ${defaults.modifiedCount}; transcript fields removed from ${stripped.modifiedCount}`,
);
process.exit(0);
