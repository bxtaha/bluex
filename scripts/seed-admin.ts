/**
 * Creates (or resets the password of) an admin account, and installs the
 * collection indexes.
 *
 * Run with:  npm run seed:admin
 *
 * Deliberately a script and not something the app does for itself. An app that
 * creates a default administrator when it finds none is an app with a known
 * password on every fresh deployment; making the first account an explicit act
 * means one exists only because somebody asked for it.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env.local. Safe to re-run — it
 * upserts, so it doubles as a password reset.
 */

import { readFileSync } from "node:fs";
import { ensureIndexes, upsertAdminUser } from "../lib/admin-auth.ts";

/** Next loads .env.local for the app; a bare node process does not. */
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value.trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local before seeding.",
  );
  process.exit(1);
}

try {
  await ensureIndexes();
  const { email: stored, created } = await upsertAdminUser(email, password);
  console.log(
    created
      ? `Created admin account ${stored}.`
      : `Admin account ${stored} already existed — password reset.`,
  );
  console.log("Indexes are in place (unique email, unique token, session TTL).");
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
}

// The driver keeps a pooled socket open, which would hold the process alive.
process.exit(0);
