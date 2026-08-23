import { readPostBySlug } from "@/lib/blog";
import { SITE_NAME } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

/**
 * A card per post, carrying the post's own title.
 *
 * Most posts have no cover image, and without this file those pasted into a
 * chat as a bare row with no picture — worse, the card degraded from
 * `summary_large_image` to the small `summary` variant, because a large card
 * with no image is not something the platforms will render. Generating one
 * from the title means every post has a real card whether or not anyone
 * uploaded artwork for it.
 *
 * A post that *does* have a cover still wins: `generateMetadata` sets
 * `openGraph.images` explicitly in that case, and an explicit value takes
 * precedence over this file convention.
 */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `A post on ${SITE_NAME}`;

export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Drafts included: a preview link that someone pastes into a chat should
  // still show what it is. The page itself carries `noindex` for those, which
  // is the part that actually matters.
  const post = await readPostBySlug(slug, true).catch(() => null);

  return ogCard({
    // Falls back rather than throwing. A 500 here would break the card for a
    // page that renders perfectly well.
    heading: post?.title || "Writing about speed, leads and the web.",
    footnote: post?.author || "Notes from the studio",
  });
}
