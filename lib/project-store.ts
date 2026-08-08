import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * `projects` — the portfolio.
 *
 * Framework-free like the other stores, so the seed script can import it from
 * plain Node. `lib/projects.ts` adds the Next cache layer.
 */

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
};

export type Project = {
  id: string;
  order: number;
  clientName: string;
  description: string;
  url: string;
  screenshot: string;
  tags: string[];
  year: string;
  featured: boolean;
  visible: boolean;
  /**
   * Null when there is nothing to quote.
   *
   * Not an object of empty strings: the section renders the quote block only
   * when this is present, and "present but blank" is exactly the state that
   * produces an empty pair of quote marks under a card.
   */
  testimonial: Testimonial | null;
};

type ProjectDoc = Omit<Project, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<ProjectDoc>> {
  const db = await getDb();
  const projects = db.collection<ProjectDoc>("projects");
  await ensureIndexes(projects);
  return projects;
}

let indexed: Promise<unknown> | null = null;

function ensureIndexes(projects: Collection<ProjectDoc>): Promise<unknown> {
  indexed ??= projects
    .createIndex({ visible: 1, order: 1 })
    .catch((error) => {
      console.error("[projects] could not create indexes:", error);
      indexed = null;
    });
  return indexed;
}

/**
 * A testimonial is only real if there is something to say and someone who said
 * it. A quote with no attribution is an anonymous claim about your own work,
 * which is worth less than no quote at all.
 */
function toTestimonial(value: Partial<Testimonial> | null | undefined): Testimonial | null {
  const quote = value?.quote?.trim() ?? "";
  const author = value?.author?.trim() ?? "";
  if (!quote || !author) return null;
  return { quote, author, role: value?.role?.trim() ?? "" };
}

function toProject(doc: ProjectDoc & { _id: ObjectId }): Project {
  return {
    id: doc._id.toHexString(),
    order: doc.order ?? 0,
    clientName: doc.clientName ?? "",
    description: doc.description ?? "",
    url: doc.url ?? "",
    screenshot: doc.screenshot ?? "",
    tags: doc.tags ?? [],
    year: doc.year ?? "",
    featured: Boolean(doc.featured),
    visible: doc.visible !== false,
    testimonial: toTestimonial(doc.testimonial),
  };
}

/**
 * The three sites currently shipped, and the fallback when Atlas cannot be
 * reached — the same reasoning as the pricing tiers. This is the section that
 * proves the work is real; rendering a hole where it should be is worse than
 * rendering slightly stale copy.
 *
 * Descriptions are placeholders pending the real copy, and the tags for two of
 * them are unset rather than guessed. An invented tag on a client's project is
 * a claim about their business.
 */
export const DEFAULT_PROJECTS: Omit<Project, "id">[] = [
  {
    order: 0,
    clientName: "New Star Toys",
    description:
      "A manufacturer's catalogue rebuilt as a site that sells — placeholder copy, pending the real description.",
    url: "https://newstartoys.com",
    screenshot: "",
    tags: ["Manufacturing", "Custom build"],
    year: "",
    featured: true,
    visible: true,
    testimonial: null,
  },
  {
    order: 1,
    clientName: "Qianberta",
    description: "Placeholder copy, pending the real description.",
    url: "https://qianberta.com",
    screenshot: "",
    tags: [],
    year: "",
    featured: false,
    visible: true,
    testimonial: null,
  },
  {
    order: 2,
    clientName: "Instsail",
    description: "Placeholder copy, pending the real description.",
    url: "https://instsail.com",
    screenshot: "",
    tags: [],
    year: "",
    featured: false,
    visible: true,
    testimonial: null,
  },
];

export function withFallbackIds(
  projects: Omit<Project, "id">[],
): Project[] {
  return projects.map((project, i) => ({ ...project, id: `default-${i}` }));
}

/** Everything, hidden ones included. For the admin panel. */
export async function listAllProjects(): Promise<Project[]> {
  const docs = await (await collection()).find({}).sort({ order: 1 }).toArray();
  return docs.map((doc) => toProject(doc as ProjectDoc & { _id: ObjectId }));
}

/** Raw read, uncached. `lib/projects.ts` wraps this for the public section. */
export async function readVisibleProjectsUncached(): Promise<Project[]> {
  const docs = await (await collection())
    .find({ visible: { $ne: false } })
    .sort({ order: 1 })
    .toArray();
  return docs.map((doc) => toProject(doc as ProjectDoc & { _id: ObjectId }));
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

export type ProjectInput = Partial<Omit<Project, "id" | "testimonial">> & {
  testimonial?: Partial<Testimonial> | null;
};

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/**
 * Keeps a link a link.
 *
 * A URL typed without a scheme resolves as a *relative path* in an href —
 * `newstartoys.com` becomes `/newstartoys.com` on our own domain, which 404s.
 * Anything that is not http or https is dropped entirely rather than stored and
 * rendered: `javascript:` in a "Visit site" button is the whole attack.
 */
export function normaliseUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function sanitise(input: ProjectInput): Partial<Omit<Project, "id">> {
  const out: Partial<Omit<Project, "id">> = {};

  const clientName = text(input.clientName, 120);
  if (clientName !== undefined) out.clientName = clientName;

  const description = text(input.description, 400);
  if (description !== undefined) out.description = description;

  const screenshot = text(input.screenshot, 600);
  if (screenshot !== undefined) out.screenshot = screenshot;

  const year = text(input.year, 12);
  if (year !== undefined) out.year = year;

  if (input.url !== undefined) out.url = normaliseUrl(String(input.url ?? ""));

  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().slice(0, 40))
      // An empty row is how a tag gets deleted in the editor.
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof input.featured === "boolean") out.featured = input.featured;
  if (typeof input.visible === "boolean") out.visible = input.visible;
  if (typeof input.order === "number" && Number.isFinite(input.order)) {
    out.order = Math.trunc(input.order);
  }

  if (input.testimonial !== undefined) {
    out.testimonial = toTestimonial(
      input.testimonial
        ? {
            quote: text(input.testimonial.quote, 600),
            author: text(input.testimonial.author, 120),
            role: text(input.testimonial.role, 160),
          }
        : null,
    );
  }

  return out;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const projects = await collection();
  const last = await projects.find({}).sort({ order: -1 }).limit(1).toArray();

  const doc: ProjectDoc = {
    order: (last[0]?.order ?? -1) + 1,
    clientName: "New project",
    description: "",
    url: "",
    screenshot: "",
    tags: [],
    year: "",
    featured: false,
    // Starts hidden. A blank card on the site's main trust signal is worse than
    // no card, and this is the section people judge the work by.
    visible: false,
    testimonial: null,
    ...sanitise(input),
  };

  const result = await projects.insertOne(doc);
  return toProject({ ...doc, _id: result.insertedId });
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<Project | null> {
  if (!ObjectId.isValid(id)) return null;

  const updated = await (await collection()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: sanitise(input) },
    { returnDocument: "after" },
  );

  return updated ? toProject(updated as ProjectDoc & { _id: ObjectId }) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

/**
 * Rewrites every project's `order` from the given sequence.
 *
 * Takes the whole list rather than a "move up" instruction, for the reason
 * written up in `pricing-store.ts`: two tabs applying relative moves against
 * different starting states interleave into an order neither asked for.
 */
export async function reorderProjects(ids: string[]): Promise<boolean> {
  const valid = ids.filter((id) => ObjectId.isValid(id));
  if (valid.length === 0) return false;

  await (await collection()).bulkWrite(
    valid.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { order: index } },
      },
    })),
  );

  return true;
}

/* ── The line under the cards ────────────────────────────────────────────────
   Stored in `siteSettings` beside the contact details, under its own `_id`.
   Two modules write to that collection and they touch disjoint documents,
   which is the arrangement that keeps it from becoming a shared mutable blob. */

type SettingsDoc = { _id: string; footnote?: string };

const FOOTNOTE_ID = "portfolio";

/**
 * `{count}` is substituted with the number of visible projects.
 *
 * The default copy says "Three", which stops being true the moment a fourth
 * project is added — and this section is explicitly built to scale to twenty.
 * A caption that quietly contradicts the cards above it undermines the exact
 * thing the section exists to establish, so the number can come from the data
 * rather than from someone remembering to edit a sentence.
 */
export const DEFAULT_FOOTNOTE =
  "Three of the sites we've shipped. More on request.";

const NUMBER_WORDS = [
  "None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve",
];

export function renderFootnote(template: string, count: number): string {
  // Spelled out up to twelve, then digits — the usual editorial rule, and it
  // is the difference between "Three of the sites" and "3 of the sites".
  const word = NUMBER_WORDS[count] ?? String(count);
  return template.replace(/\{count\}/gi, word);
}

async function settings(): Promise<Collection<SettingsDoc>> {
  const db = await getDb();
  return db.collection<SettingsDoc>("siteSettings");
}

export async function readFootnoteUncached(): Promise<string> {
  const doc = await (await settings()).findOne({ _id: FOOTNOTE_ID });
  return doc?.footnote?.trim() || DEFAULT_FOOTNOTE;
}

export async function updateFootnote(value: string): Promise<string> {
  const footnote = String(value ?? "").trim().slice(0, 300);
  const updated = await (await settings()).findOneAndUpdate(
    { _id: FOOTNOTE_ID },
    { $set: { footnote }, $setOnInsert: { _id: FOOTNOTE_ID } },
    { upsert: true, returnDocument: "after" },
  );
  return updated?.footnote?.trim() || DEFAULT_FOOTNOTE;
}

/** Used by the seed script. Only writes when the collection is empty. */
export async function seedProjects(): Promise<number> {
  const projects = await collection();
  if ((await projects.countDocuments()) > 0) return 0;
  const result = await projects.insertMany(
    DEFAULT_PROJECTS.map((project) => ({ ...project })),
  );
  return result.insertedCount;
}
