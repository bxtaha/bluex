/**
 * Seeds the three shipped sites.
 *
 * Run with:  npm run seed:projects
 *
 * Only writes when `projects` is empty, so re-running it never overwrites copy
 * someone has since edited in the admin panel. To start over, drop the
 * collection first.
 *
 * Descriptions are placeholders pending the real ones, and two of the three
 * have no tags — those were given as "TBD", and an invented tag on a client's
 * project is a claim about their business rather than a gap in ours.
 * Screenshots are empty: the cards render their frame without one, and the
 * admin panel is where they get added.
 */

import { readFileSync } from "node:fs";
import { seedProjects } from "../lib/project-store.ts";

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
  const inserted = await seedProjects();
  console.log(
    inserted > 0
      ? `Inserted ${inserted} projects.`
      : "projects already has documents — left untouched.",
  );
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
}

process.exit(0);
