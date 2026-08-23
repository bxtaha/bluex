import type { Metadata } from "next";
import Link from "next/link";
import {
  POSTS_PER_PAGE,
  readCategories,
  readFeaturedPost,
  readPublishedPosts,
} from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { PostCard } from "@/components/blog/post-card";
import { CategoryPills } from "@/components/blog/category-pills";
import { Pagination } from "@/components/blog/pagination";

/**
 * The index.
 *
 * **Rendered per request, unlike the posts themselves.** The category filter
 * and the page number are query parameters, and reading `searchParams` opts a
 * route out of static generation — there is no "static with search params".
 * The alternative was a tree of segments (`/blog/category/x/page/2`), which
 * would statically generate but reserves `category` and `page` as slugs no post
 * may ever use, and multiplies the routes a crawler sees.
 *
 * Spending the staticness on `/blog/[slug]` instead is the right trade: the
 * posts are what gets indexed, linked and shared, and this page is two indexed
 * queries that Mongo answers in single-digit milliseconds.
 */

type SearchParams = Promise<{ category?: string; page?: string }>;

export const metadata: Metadata = {
  title: `Writing — ${SITE_NAME}`,
  description:
    "Notes on building fast websites and AI voice agents that call leads back within five minutes.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": `${SITE_URL}/blog/rss.xml` },
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title: `Writing — ${SITE_NAME}`,
    description:
      "Notes on building fast websites and AI voice agents that call leads back within five minutes.",
    // Declaring `openGraph` at all replaces the root block rather than merging
    // with it, so `siteName` has to be restated or the card loses its byline.
    siteName: SITE_NAME,
  },
  // Stated for the same reason, and it is not decoration: without this block
  // the page fell back to the *root* Twitter metadata, so one link showed
  // "Writing — BlueX" in Slack and "BlueX — Every lead called back in five
  // minutes" on X. Same URL, two different claims about what it is.
  twitter: {
    card: "summary_large_image",
    title: `Writing — ${SITE_NAME}`,
    description:
      "Notes on building fast websites and AI voice agents that call leads back within five minutes.",
  },
};

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const category = (params.category ?? "").trim();
  const page = Math.max(Number.parseInt(params.page ?? "1", 10) || 1, 1);

  const [{ posts, total }, categories, featured] = await Promise.all([
    readPublishedPosts({ category, page, perPage: POSTS_PER_PAGE }),
    readCategories(),
    // Only on the unfiltered first page. A "featured" post pulled to the top of
    // a category it does not belong to would be a lie about what you filtered
    // for, and repeating it above page two is just showing it twice.
    category === "" && page === 1 ? readFeaturedPost() : Promise.resolve(null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  // The lead card is already on the page, so it does not appear again below it.
  const rest = featured ? posts.filter((post) => post.id !== featured.id) : posts;

  return (
    <div className="mx-auto max-w-[100rem] px-6 pb-24 pt-32 sm:px-10 md:pb-32 md:pt-40 lg:px-16">
      <header className="max-w-2xl">
        <p className="bx-eyebrow">Writing</p>
        <h1 className="bx-display mt-3 text-[clamp(2.25rem,6vw,4.5rem)] text-ink">
          {category || "What we've learned building this."}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">
          Notes from the work — what actually moved a number, what turned out
          not to, and the things that cost us a week.
        </p>
      </header>

      <div className="mt-10">
        <CategoryPills categories={categories} active={category} />
      </div>

      {/* The only place an empty state belongs. The homepage teaser hides
          itself instead — see `BlogTeaser`. */}
      {total === 0 ? (
        <div className="bx-card bx-hairline mt-12 px-6 py-20 text-center">
          <p className="bx-display text-2xl text-ink">
            {category ? `Nothing in ${category} yet.` : "Nothing published yet."}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            {category
              ? "Try another category — there is writing in the others."
              : "The first pieces are being written. Check back shortly, or subscribe to the feed."}
          </p>
          {category && (
            <Link href="/blog" className="bx-btn bx-btn--ghost bx-btn--sm mt-7">
              See everything
            </Link>
          )}
        </div>
      ) : (
        <>
          {featured && (
            <div className="mt-12">
              <PostCard
                post={featured}
                featured
                imageWidth={1400}
                headingLevel="h2"
              />
            </div>
          )}

          {rest.length > 0 && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} headingLevel="h2" />
              ))}
            </div>
          )}

          <div className="mt-14">
            <Pagination
              page={page}
              totalPages={totalPages}
              category={category}
            />
          </div>
        </>
      )}
    </div>
  );
}
