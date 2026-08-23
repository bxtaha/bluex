import { SITE_NAME } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

/**
 * The blog index's card.
 *
 * Without this file the index inherited nothing: a route that declares its own
 * `openGraph` block replaces the root's rather than merging with it, so
 * `/blog` was being pasted into chats as a bare text row while `/` showed a
 * card. The file convention fills that back in.
 */
export const alt = `Writing — ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function BlogOpengraphImage() {
  return ogCard({
    heading: "Writing about speed, leads and the web.",
    footnote: "Notes from the studio",
  });
}
