import { SITE_TAGLINE } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

/** The card that appears when the site is pasted into a chat or a timeline. */
export const alt = `BlueX — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return ogCard({
    heading: `${SITE_TAGLINE}.`,
    footnote: "AI voice agents · Web & e-commerce",
  });
}
