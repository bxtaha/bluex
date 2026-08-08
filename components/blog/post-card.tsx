import Link from "next/link";
import { Clock } from "lucide-react";
import {
  coverImageUrl,
  formatPostDate,
  isoDate,
  readTimeLabel,
} from "@/lib/blog-format";
import type { PostCard as PostCardData } from "@/lib/blog-store";

/**
 * One post as a card.
 *
 * A server component with no interactivity of its own — the whole card is a
 * link, so there is nothing to hydrate. It wears `bx-card bx-hairline bx-lift`
 * like the services and pricing cards, because it belongs to the same page and
 * should not merely resemble them.
 *
 * `featured` is the index's lead item: the same card, laid out side by side and
 * given a larger title, rather than a second component that would drift.
 */
export function PostCard({
  post,
  featured = false,
  /** Sizing hint for the CDN. The lead image is roughly twice the width. */
  imageWidth = 800,
  headingLevel: Heading = "h3",
}: {
  post: PostCardData;
  featured?: boolean;
  imageWidth?: number;
  headingLevel?: "h2" | "h3";
}) {
  const cover = coverImageUrl(post.coverImage, imageWidth);

  return (
    <article
      className={`bx-card bx-hairline bx-lift bx-post-card ${
        featured ? "bx-post-card--featured" : ""
      }`}
    >
      <Link href={`/blog/${post.slug}`} className="bx-post-card__link">
        <div className="bx-post-card__media">
          {cover ? (
            /* eslint-disable-next-line @next/next/no-img-element -- see
               `coverImageUrl`: these URLs are admin-supplied and may point at
               any host, which `next/image` refuses unless it is allow-listed
               at build time. Cloudinary does the resizing on delivery. */
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="bx-post-card__image"
            />
          ) : (
            // Not an empty box: a post with no cover still needs the card to
            // hold its shape in the grid, or the row's heights disagree.
            <div className="bx-post-card__placeholder" aria-hidden />
          )}

          {post.category && (
            <span className="bx-post-card__pill">{post.category}</span>
          )}
        </div>

        <div className="bx-post-card__body">
          <Heading className="bx-post-card__title bx-display">
            {post.title}
          </Heading>

          {post.excerpt && (
            <p className="bx-post-card__excerpt">{post.excerpt}</p>
          )}

          <div className="bx-post-card__meta">
            {post.publishedAt && (
              <time dateTime={isoDate(post.publishedAt)}>
                {formatPostDate(post.publishedAt)}
              </time>
            )}
            <span className="bx-post-card__dot" aria-hidden />
            <span className="bx-post-card__read">
              <Clock className="size-3.5" strokeWidth={1.8} aria-hidden />
              {readTimeLabel(post.readTime)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
