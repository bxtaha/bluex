import { revalidatePath } from "next/cache";
import { sanitisePostHtml } from "./blog-content.ts";
import {
  createPost as createPostRaw,
  seedPosts as seedPostsRaw,
  updatePost as updatePostRaw,
  type PostInput,
} from "./blog-store.ts";

/**
 * The Next-facing half of the blog.
 *
 * **This one caches differently from pricing, FAQ and contact, on purpose.**
 * Those wrap their reads in `unstable_cache` with a tag and no expiry, because
 * their content only changes when an admin changes it — so an invalidation on
 * save is a complete answer.
 *
 * A blog has a second way of changing: a post scheduled for Tuesday becomes
 * public on Tuesday with nobody touching anything. A tag-only cache would hold
 * the Monday answer indefinitely and the post would appear whenever someone
 * next happened to save an unrelated edit. So the pages carry
 * `export const revalidate = 60` and the reads below run against the database,
 * with the rendered page as the cache. `publishBlog()` still forces the pages
 * stale on save, so an edit is immediate rather than up to a minute late.
 */

/** Matches the `revalidate` exported by every blog-bearing route. */
export const BLOG_REVALIDATE = 60;

/** Posts per page on the index. */
export const POSTS_PER_PAGE = 12;

/** The teaser is all-or-nothing below this many published posts. */
export const TEASER_MINIMUM = 3;

export {
  deletePost,
  excerptFor,
  isPubliclyVisible,
  listAllPosts,
  readAdjacentPosts,
  readCategories,
  readFeaturedPost,
  readPostById,
  readPostBySlug,
  readPublishedPosts,
  readPublishedSlugs,
  readRecentPosts,
  readRelatedPosts,
  readTimeFor,
  slugify,
  type Post,
  type PostCard,
  type PostInput,
  type PostSeo,
  type PostStatus,
} from "./blog-store.ts";

export { renderPostContent, sanitisePostHtml } from "./blog-content.ts";

/**
 * Content is sanitised on the way in as well as on the way out.
 *
 * The store takes the sanitiser as an argument rather than importing it, so
 * that a seed script running under plain Node does not have to load an HTML
 * parser it will never need. These three wrappers are the only callers that
 * supply it, which also means there is no path into the collection that skips
 * it.
 */
export function createPost(input: PostInput) {
  return createPostRaw(input, sanitisePostHtml);
}

export function updatePost(id: string, input: PostInput) {
  return updatePostRaw(id, input, sanitisePostHtml);
}

export function seedPosts(posts: PostInput[]) {
  return seedPostsRaw(posts, sanitisePostHtml);
}

/**
 * Publishes a change to the live site.
 *
 * Four paths, because a post appears in four places and Next caches each of
 * them separately: the homepage teaser, the index, the post itself, and the
 * feed. Missing one is not a subtle bug — it is an edit that is live on the
 * post page and stale in the list linking to it.
 *
 * `slug` covers the post's own page; `previousSlug` is for a rename, where the
 * old URL also has to be dropped or it keeps serving a page that no longer
 * exists at that address.
 */
export function publishBlog(slug?: string, previousSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/blog/${previousSlug}`);
  }
}
