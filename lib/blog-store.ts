import { ObjectId, type Collection, type Filter } from "mongodb";
import { getDb } from "./mongodb.ts";
import { countWords, htmlToText } from "./html-text.ts";

/**
 * `posts` — the blog.
 *
 * Framework-free like the other stores, so the seed script and any future job
 * can import it from plain Node. `lib/blog.ts` is the Next-facing half.
 */

export type PostStatus = "draft" | "published";

export type PostSeo = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Sanitised HTML from the editor. Never the raw editor output. */
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  status: PostStatus;
  featured: boolean;
  /** When it goes live. A future date is a scheduled post — see `PUBLIC_FILTER`. */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Whole minutes, computed on save from the content's word count. */
  readTime: number;
  seo: PostSeo;
};

type PostDoc = Omit<Post, "id"> & { _id?: ObjectId };

async function collection(): Promise<Collection<PostDoc>> {
  const db = await getDb();
  const posts = db.collection<PostDoc>("posts");
  await ensureIndexes(posts);
  return posts;
}

let indexed: Promise<unknown> | null = null;

/**
 * Indexes, once per process.
 *
 * `slug` is unique because it is the URL. Two posts that resolve to the same
 * address is not a display bug — one of them becomes unreachable, and which one
 * depends on insertion order.
 */
function ensureIndexes(posts: Collection<PostDoc>): Promise<unknown> {
  indexed ??= Promise.all([
    posts.createIndex({ slug: 1 }, { unique: true }),
    posts.createIndex({ status: 1, publishedAt: -1 }),
    posts.createIndex({ category: 1, publishedAt: -1 }),
  ]).catch((error) => {
    console.error("[blog] could not create indexes:", error);
    indexed = null;
  });
  return indexed;
}

/**
 * What the public may see.
 *
 * Two conditions, not one. `status: "published"` alone would put a post
 * scheduled for next Tuesday on the site today — `publishedAt` is both the
 * displayed date and the embargo, which is what makes "schedule for later" a
 * date field rather than a second workflow.
 */
function publicFilter(now = new Date()): Filter<PostDoc> {
  return { status: "published", publishedAt: { $ne: null, $lte: now } };
}

/**
 * The same question asked of a post already in hand.
 *
 * It lives next to `publicFilter` because it *is* `publicFilter`, evaluated in
 * JavaScript instead of by Mongo, and the two drifting is the bug this pairing
 * exists to prevent. It did drift once: the preview page asked
 * `status !== "published"` instead, which is true of a draft and false of a
 * post scheduled for next week — so a scheduled post rendered in preview with
 * no draft banner, full structured data and no `noindex`, describing itself to
 * crawlers as a live page that the site returns 404 for.
 */
export function isPubliclyVisible(
  post: Pick<Post, "status" | "publishedAt">,
  now = new Date(),
): boolean {
  return (
    post.status === "published" &&
    post.publishedAt != null &&
    new Date(post.publishedAt).getTime() <= now.getTime()
  );
}

function toPost(doc: PostDoc & { _id: ObjectId }): Post {
  return {
    id: doc._id.toHexString(),
    title: doc.title ?? "",
    slug: doc.slug ?? "",
    excerpt: doc.excerpt ?? "",
    content: doc.content ?? "",
    coverImage: doc.coverImage ?? "",
    category: doc.category ?? "",
    tags: doc.tags ?? [],
    author: doc.author ?? "",
    status: doc.status === "published" ? "published" : "draft",
    featured: Boolean(doc.featured),
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
    readTime: doc.readTime || 1,
    seo: {
      metaTitle: doc.seo?.metaTitle ?? "",
      metaDescription: doc.seo?.metaDescription ?? "",
      ogImage: doc.seo?.ogImage ?? "",
    },
  };
}

/* ── Derived fields ──────────────────────────────────────────────────────── */

/**
 * A URL-safe slug.
 *
 * `NFKD` first so accented letters decompose into a base letter plus a
 * combining mark, and the mark is what gets stripped — "Café" becomes "cafe"
 * rather than "caf". Getting this wrong is invisible in English and mangles
 * every other language the moment one appears in a title.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    // The combining-marks block, written as escapes: the characters themselves
    // are invisible in a source file and survive copy-paste unreliably.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "post";
}

/** Words a minute. The usual figure for online prose. */
const WORDS_PER_MINUTE = 200;

export function readTimeFor(content: string): number {
  return Math.max(1, Math.round(countWords(htmlToText(content)) / WORDS_PER_MINUTE));
}

/**
 * The first ~160 characters, cut at a word boundary.
 *
 * Only used when the excerpt is left blank. Truncating mid-word reads as a
 * broken string rather than a summary, and this text is also the meta
 * description fallback, so it is what a search result shows.
 */
export function excerptFor(content: string, limit = 160): string {
  const text = htmlToText(content).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:—-]+$/, "")}…`;
}

/* ── Public reads ────────────────────────────────────────────────────────── */

export type PostCard = Omit<Post, "content">;

/** The list projection. A grid of cards does not need every post's body. */
const CARD_PROJECTION = { content: 0 } as const;

export async function readPublishedPosts(options: {
  category?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<{ posts: PostCard[]; total: number }> {
  const perPage = Math.min(Math.max(options.perPage ?? 12, 1), 50);
  const page = Math.max(options.page ?? 1, 1);

  const filter: Filter<PostDoc> = publicFilter();
  if (options.category) filter.category = options.category;

  const posts = await collection();
  const [docs, total] = await Promise.all([
    posts
      .find(filter, { projection: CARD_PROJECTION })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray(),
    posts.countDocuments(filter),
  ]);

  return {
    posts: docs.map((doc) => toPost(doc as PostDoc & { _id: ObjectId })),
    total,
  };
}

/** The most recent N, for the homepage teaser. */
export async function readRecentPosts(limit = 3): Promise<PostCard[]> {
  const docs = await (await collection())
    .find(publicFilter(), { projection: CARD_PROJECTION })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toPost(doc as PostDoc & { _id: ObjectId }));
}

/**
 * The featured post for the top of the index.
 *
 * Falls back to the most recent when nothing is flagged, so the index always
 * has a lead item rather than an empty hero above a grid.
 */
export async function readFeaturedPost(): Promise<PostCard | null> {
  const posts = await collection();
  const doc =
    (await posts.findOne(
      { ...publicFilter(), featured: true },
      { projection: CARD_PROJECTION, sort: { publishedAt: -1 } },
    )) ??
    (await posts.findOne(publicFilter(), {
      projection: CARD_PROJECTION,
      sort: { publishedAt: -1 },
    }));

  return doc ? toPost(doc as PostDoc & { _id: ObjectId }) : null;
}

/**
 * One post by slug.
 *
 * `includeUnpublished` is the draft-preview door and it is only ever opened by
 * a caller that has already checked for an admin session.
 */
export async function readPostBySlug(
  slug: string,
  includeUnpublished = false,
): Promise<Post | null> {
  const filter: Filter<PostDoc> = includeUnpublished
    ? { slug }
    : { ...publicFilter(), slug };

  const doc = await (await collection()).findOne(filter);
  return doc ? toPost(doc as PostDoc & { _id: ObjectId }) : null;
}

/** Slugs for `generateStaticParams`. Published only — drafts have no page. */
export async function readPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date; publishedAt: Date | null }[]
> {
  const docs = await (await collection())
    .find(publicFilter(), {
      projection: { slug: 1, updatedAt: 1, publishedAt: 1 },
    })
    .sort({ publishedAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    slug: doc.slug,
    updatedAt: doc.updatedAt ?? new Date(),
    publishedAt: doc.publishedAt ?? null,
  }));
}

/** Categories that actually have a published post in them. */
export async function readCategories(): Promise<string[]> {
  const values = await (await collection()).distinct("category", publicFilter());
  return values.filter((value): value is string => Boolean(value)).sort();
}

/** Same category, most recent first, never the post itself. */
export async function readRelatedPosts(
  post: Pick<Post, "id" | "category">,
  limit = 3,
): Promise<PostCard[]> {
  if (!post.category) return [];
  const docs = await (await collection())
    .find(
      {
        ...publicFilter(),
        category: post.category,
        _id: { $ne: new ObjectId(post.id) },
      },
      { projection: CARD_PROJECTION },
    )
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toPost(doc as PostDoc & { _id: ObjectId }));
}

/**
 * The posts either side of this one in publication order.
 *
 * "Previous" is older and "next" is newer, matching the reading order of the
 * index above it — the opposite convention reads correctly on a single post and
 * backwards the moment someone arrives from the list.
 */
export async function readAdjacentPosts(
  post: Pick<Post, "publishedAt">,
): Promise<{ previous: PostCard | null; next: PostCard | null }> {
  if (!post.publishedAt) return { previous: null, next: null };

  const posts = await collection();
  const [older, newer] = await Promise.all([
    posts.findOne(
      { ...publicFilter(), publishedAt: { $lt: post.publishedAt } },
      { projection: CARD_PROJECTION, sort: { publishedAt: -1 } },
    ),
    posts.findOne(
      {
        status: "published",
        publishedAt: { $gt: post.publishedAt, $lte: new Date() },
      },
      { projection: CARD_PROJECTION, sort: { publishedAt: 1 } },
    ),
  ]);

  return {
    previous: older ? toPost(older as PostDoc & { _id: ObjectId }) : null,
    next: newer ? toPost(newer as PostDoc & { _id: ObjectId }) : null,
  };
}

/* ── Admin reads ─────────────────────────────────────────────────────────── */

/** Everything, drafts and scheduled posts included. */
export async function listAllPosts(): Promise<PostCard[]> {
  const docs = await (await collection())
    .find({}, { projection: CARD_PROJECTION })
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((doc) => toPost(doc as PostDoc & { _id: ObjectId }));
}

export async function readPostById(id: string): Promise<Post | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await collection()).findOne({ _id: new ObjectId(id) });
  return doc ? toPost(doc as PostDoc & { _id: ObjectId }) : null;
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

export type PostInput = Partial<
  Omit<Post, "id" | "createdAt" | "updatedAt" | "readTime">
> & { seo?: Partial<PostSeo> };

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/**
 * Normalises whatever the editor sent.
 *
 * `sanitiseContent` is injected rather than imported because sanitising pulls
 * in `sanitize-html`, and this module is imported by a seed script that has no
 * business loading a parser. The callers in `lib/blog.ts` always pass it.
 */
function sanitise(
  input: PostInput,
  sanitiseContent: (html: string) => string,
): Partial<Omit<Post, "id">> {
  const out: Partial<Omit<Post, "id">> = {};

  const title = text(input.title, 200);
  if (title !== undefined) out.title = title;

  const slug = text(input.slug, 120);
  if (slug !== undefined) out.slug = slugify(slug);

  const coverImage = text(input.coverImage, 600);
  if (coverImage !== undefined) out.coverImage = coverImage;

  const category = text(input.category, 60);
  if (category !== undefined) out.category = category;

  const author = text(input.author, 120);
  if (author !== undefined) out.author = author;

  if (input.content !== undefined) {
    out.content = sanitiseContent(String(input.content ?? ""));
    // Both are derived from the body, so both are recomputed whenever it
    // changes. An excerpt typed by hand survives — see below.
    out.readTime = readTimeFor(out.content);
  }

  if (input.excerpt !== undefined) {
    const excerpt = text(input.excerpt, 400) ?? "";
    // Blank means "work it out for me", which is the brief. It is resolved on
    // save rather than on render so what the admin sees listed is what a
    // search result will show.
    out.excerpt =
      excerpt || excerptFor(out.content ?? String(input.content ?? ""));
  }

  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 20);
  }

  if (input.status === "draft" || input.status === "published") {
    out.status = input.status;
  }
  if (typeof input.featured === "boolean") out.featured = input.featured;

  if (input.publishedAt !== undefined) {
    const date = input.publishedAt ? new Date(input.publishedAt) : null;
    // An unparseable date becomes null rather than `Invalid Date`, which Mongo
    // stores happily and every comparison against it then returns false.
    out.publishedAt = date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if (input.seo) {
    out.seo = {
      metaTitle: text(input.seo.metaTitle, 200) ?? "",
      metaDescription: text(input.seo.metaDescription, 400) ?? "",
      ogImage: text(input.seo.ogImage, 600) ?? "",
    };
  }

  return out;
}

/**
 * Makes a slug unique by suffixing it.
 *
 * The unique index is the real guarantee; this is what keeps a collision from
 * surfacing as "could not save" when the fix is mechanical and obvious.
 */
async function uniqueSlug(base: string, exclude?: ObjectId): Promise<string> {
  const posts = await collection();
  let candidate = base;

  for (let n = 2; n < 200; n += 1) {
    const clash = await posts.findOne(
      exclude ? { slug: candidate, _id: { $ne: exclude } } : { slug: candidate },
      { projection: { _id: 1 } },
    );
    if (!clash) return candidate;
    candidate = `${base}-${n}`;
  }

  return `${base}-${Date.now()}`;
}

export async function createPost(
  input: PostInput,
  sanitiseContent: (html: string) => string,
): Promise<Post> {
  const patch = sanitise(input, sanitiseContent);
  const now = new Date();

  const title = patch.title || "Untitled post";
  const content = patch.content ?? "";

  const doc: PostDoc = {
    title,
    slug: await uniqueSlug(patch.slug || slugify(title)),
    excerpt: patch.excerpt ?? excerptFor(content),
    content,
    coverImage: patch.coverImage ?? "",
    category: patch.category ?? "",
    tags: patch.tags ?? [],
    author: patch.author ?? "BlueX",
    // New posts start as drafts. The alternative is a half-written page live on
    // the site for as long as it takes someone to notice.
    status: patch.status ?? "draft",
    featured: patch.featured ?? false,
    publishedAt: patch.publishedAt ?? null,
    createdAt: now,
    updatedAt: now,
    readTime: patch.readTime ?? readTimeFor(content),
    seo: patch.seo ?? { metaTitle: "", metaDescription: "", ogImage: "" },
  };

  const result = await (await collection()).insertOne(doc);
  if (doc.featured) await demoteOtherFeatured(result.insertedId);

  return toPost({ ...doc, _id: result.insertedId });
}

/** Featured is a position, not a property — two lead posts lead nowhere. */
async function demoteOtherFeatured(keep: ObjectId): Promise<void> {
  await (await collection()).updateMany(
    { _id: { $ne: keep }, featured: true },
    { $set: { featured: false } },
  );
}

export async function updatePost(
  id: string,
  input: PostInput,
  sanitiseContent: (html: string) => string,
): Promise<Post | null> {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);

  const patch = sanitise(input, sanitiseContent);
  if (patch.slug) patch.slug = await uniqueSlug(patch.slug, _id);

  const posts = await collection();

  // Publishing with no date set means "now". Without this a post can be marked
  // published, carry a null `publishedAt`, and be filtered out of every public
  // query — live according to the admin panel and invisible on the site.
  if (patch.status === "published" && patch.publishedAt === undefined) {
    const current = await posts.findOne({ _id }, { projection: { publishedAt: 1 } });
    if (!current?.publishedAt) patch.publishedAt = new Date();
  }

  const updated = await posts.findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) return null;

  if (patch.featured === true) await demoteOtherFeatured(_id);

  return toPost(updated as PostDoc & { _id: ObjectId });
}

export async function deletePost(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await collection()).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

/** Used by the seed script. Only writes when the collection is empty. */
export async function seedPosts(
  posts: PostInput[],
  sanitiseContent: (html: string) => string,
): Promise<number> {
  const collectionRef = await collection();
  if ((await collectionRef.countDocuments()) > 0) return 0;

  let written = 0;
  for (const post of posts) {
    await createPost(post, sanitiseContent);
    written += 1;
  }
  return written;
}
