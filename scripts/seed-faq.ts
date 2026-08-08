/**
 * Seeds the eight default FAQ entries.
 *
 * Run with:  npm run seed:faq
 *
 * Only writes when `faqs` is empty, so re-running it never overwrites
 * copy someone has since edited in the admin panel. To start over, drop the
 * collection first.
 */

import { readFileSync } from "node:fs";
import { seedFaqs } from "../lib/faq-store.ts";

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

try {
  const inserted = await seedFaqs();
  console.log(
    inserted > 0
      ? `Inserted ${inserted} FAQ entries.`
      : "faqs already has documents — left untouched.",
  );
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
}

process.exit(0);
