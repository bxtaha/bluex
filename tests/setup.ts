import { readFileSync } from "node:fs";

/**
 * Test setup.
 *
 * Two jobs, and the order matters: load `.env.local` the way the seed scripts
 * do (a bare `node` process does not read it, only Next does), then point the
 * database name at a scratch database *before* anything imports
 * `lib/mongodb.ts`.
 *
 * That redirection is the whole reason this file exists. `getDb` reads
 * `MONGO_DB_PROJECT_NAME` on every call, so setting it here sends every query in
 * the suite to a database created for the run and dropped at the end. Without it
 * these tests would create, suspend and delete records in the live `clients`
 * collection — a test suite that can damage production is worse than no suite,
 * because it will be run by someone who does not know that.
 */

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

/** Distinct from anything the app uses, and obvious in a database listing. */
export const TEST_DB = "bx_test_suite";

process.env.MONGO_DB_PROJECT_NAME = TEST_DB;

export const hasDatabase = !!process.env.MONGO_URI;

/**
 * Removes the scratch database.
 *
 * Guarded on the name rather than trusted: this drops a whole database, and the
 * one thing that must never happen is it running against the app's. If the name
 * is not the one this module set, something has reassigned the variable and the
 * safe move is to refuse.
 */
export async function dropTestDatabase(): Promise<void> {
  if (process.env.MONGO_DB_PROJECT_NAME !== TEST_DB) {
    throw new Error(
      `Refusing to drop database "${process.env.MONGO_DB_PROJECT_NAME}" — expected "${TEST_DB}".`,
    );
  }

  const { getDb } = await import("../lib/mongodb.ts");
  const db = await getDb();
  if (db.databaseName !== TEST_DB) {
    throw new Error(
      `Refusing to drop database "${db.databaseName}" — expected "${TEST_DB}".`,
    );
  }

  await db.dropDatabase();
}

/** Unique per call, so tests never collide on the unique email index. */
let counter = 0;
export function uniqueEmail(label: string): string {
  counter += 1;
  return `${label}-${counter}-${process.pid}@example.test`;
}
