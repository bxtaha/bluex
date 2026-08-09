import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import {
  isPubliclyVisible,
  readAdjacentPosts,
  readPostBySlug,
  readPublishedSlugs,
  readRelatedPosts,
  renderPostContent,
  type Post,
} from "@/lib/blog";
import { coverImageUrl, formatPostDate, isoDate, readTimeLabel } from "@/lib/blog-format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { PostCard } from "@/components/blog/post-card";
import { PostCta } from "@/components/blog/post-cta";
import { PostNav } from "@/components/blog/post-nav";

/**
 * A post.
 *
 * Statically generated per published slug and revalidated every minute, which
 * is what lets a newly published — or newly *scheduled* — post appear without a
 * deploy. `dynamicParams` stays on so a slug created after the last build is
 * rendered on first request rather than 404ing until something rebuilds.
 *
 * The number below is a literal because Next parses segment config exports
 * statically, before any module is evaluated — `export const revalidate =
 * BLOG_REVALIDATE` fails the build with "Invalid segment configuration
 * export". The shared constant still exists in `lib/blog.ts` for the places
 * that are ordinary code.
 */
export const revalidate = 60;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    return (await readPublishedSlugs()).map(({ slug }) => ({ slug }));
  } catch (error) {
    // A build must not fail because Atlas was unreachable for a moment. With no
    // params every post is rendered on demand instead, which is slower for the
    // first visitor and correct for all of them.
    console.error("[blog] could not enumerate slugs:", error);
    return [];
  }
}

/**
 * Loads a post, honouring draft preview.
 *
 * Draft mode is a signed cookie Next sets, and only `/api/admin/blog/preview`
 * sets it — behind the admin session guard. So the unpublished branch here is
 * reachable only by someone who was signed in when they asked for it, and
 * everyone else gets the published filter and a 404.
 */
async function loadPost(slug: string): Promise<{ post: Post; preview: boolean }> {
  const { isEnabled } = await draftMode();
  const post = await readPostBySlug(slug, isEnabled);
  if (!post) notFound();
  // "Being previewed" means the post is not publicly visible — which covers a
  // draft *and* a post scheduled for later. Asking `status !== "published"`
  // misses the second, and a scheduled post would then render as though it
  // were live.
  return { post, preview: isEnabled && !isPubliclyVisible(post) };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;

  const { isEnabled } = await draftMode();
  const post = await readPostBySlug(slug, isEnabled).catch(() => null);
  if (!post) return { title: "Not found" };

  // Every SEO field falls back to the post's own content rather than to
  // nothing, so a post nobody filled the SEO tab in for still has a sensible
  // title, description and card image.
  const title = post.seo.metaTitle || post.title;
  const description = post.seo.metaDescription || post.excerpt;
  const image = post.seo.ogImage || post.coverImage;
  const url = `/blog/${post.slug}`;

  return {
    title: `${title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    // A preview URL that leaks should not also be asking to be indexed. Keyed
    // on public visibility, not on status, so a scheduled post is covered too.
    robots: isPubliclyVisible(post) ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: SITE_NAME,
      publishedTime: isoDate(post.publishedAt) || undefined,
      modifiedTime: isoDate(post.updatedAt) || undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      images: image ? [{ url: image, alt: post.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * Serialises JSON-LD for a `<script>` tag.
 *
 * `JSON.stringify` escapes quotes but not `<`, so a title containing
 * `</script>` would close the tag early and drop the rest of the document into
 * the page as markup. This content is typed into the admin panel, so it is
 * input and gets treated as such — the same reasoning as the pricing section.
 */
function serialiseJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { post, preview } = await loadPost(slug);

  const [content, related, adjacent] = await Promise.all([
    renderPostContent(post.content),
    readRelatedPosts(post, 3),
    readAdjacentPosts(post),
  ]);

  const cover = coverImageUrl(post.coverImage, 1600);
  const url = `${SITE_URL}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.seo.metaDescription || post.excerpt,
    image: post.seo.ogImage || post.coverImage || undefined,
    datePublished: isoDate(post.publishedAt) || undefined,
    dateModified: isoDate(post.updatedAt) || undefined,
    author: { "@type": "Person", name: post.author || SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      "@id": `${SITE_URL}#organization`,
    },
    articleSection: post.category || undefined,
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
  };

  return (
    <>
      {/* Structured data is omitted for a draft: it describes a page that is
          not public, and a crawler that reached the preview URL should not be
          handed a machine-readable record of it. */}
      {!preview && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
        />
      )}

      <ReadingProgress targetId="post-article" />

      {preview && (
        <p className="bx-post-preview" role="status">
          Draft preview — this post is not public.{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              a route handler, not a page. It clears Next's draft cookie and
              redirects, which only happens on a real navigation; a client-side
              `Link` transition would leave the cookie set. */}
          <a href="/api/admin/blog/preview?exit=1">Leave preview</a>
        </p>
      )}

      <article
        id="post-article"
        className="mx-auto max-w-[100rem] px-6 pb-20 pt-32 sm:px-10 md:pt-40 lg:px-16"
      >
        <header className="bx-prose-width">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            {post.category && (
              <Link
                href={`/blog?category=${encodeURIComponent(post.category)}`}
                className="bx-post-card__pill bx-post-card__pill--static"
              >
                {post.category}
              </Link>
            )}
            {post.publishedAt && (
              <time dateTime={isoDate(post.publishedAt)}>
                {formatPostDate(post.publishedAt)}
              </time>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.8} aria-hidden />
              {readTimeLabel(post.readTime)}
            </span>
          </div>

          <h1 className="bx-display mt-5 text-[clamp(2.25rem,6vw,4rem)] text-ink">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              {post.excerpt}
            </p>
          )}

          {post.author && (
            <p className="mt-6 text-sm text-ink-muted">By {post.author}</p>
          )}
        </header>

        {cover && (
          <figure className="bx-post-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied
                URLs may point at any host, which `next/image` refuses unless it
                is allow-listed at build time. See `coverImageUrl`. */}
            <img src={cover} alt="" className="bx-post-cover__image" />
          </figure>
        )}

        {/* Sanitised twice — on save and again inside `renderPostContent` —
            before it reaches this attribute. See `lib/blog-content.ts`. */}
        <div
          className="bx-prose bx-prose-width"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        <div className="bx-prose-width mt-16">
          <PostCta />
        </div>

        <div className="bx-prose-width mt-12">
          <PostNav previous={adjacent.previous} next={adjacent.next} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-[100rem] border-t border-white/8 px-6 py-20 sm:px-10 lg:px-16">
          <h2 className="bx-display text-2xl text-ink sm:text-3xl">
            More on {post.category}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
