import { ImageResponse } from "next/og";
import { SITE_URL } from "./site.ts";

/**
 * The share card, drawn once and reused by every route that needs one.
 *
 * Three pages want this image — the home page, the blog index, and each post —
 * and three copies of the same gradient would drift the first time one of them
 * was adjusted. The heading is the only thing that differs, so the heading is
 * the only thing a caller passes.
 *
 * Drawn by `next/og` rather than shipped as a PNG so the wording cannot fall
 * out of step with the copy it is quoting. No webfont is loaded: the site's
 * faces are self-hosted woff2 meant for a browser, and fetching them to render
 * one image costs more than the system stack is worth here.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Headline size, chosen from the length of the headline.
 *
 * A post title can be four words or fourteen, and one fixed size cannot serve
 * both: the tagline at 82px fills the card, while "A template is a decision
 * somebody else made about your business" at 82px runs off the bottom of it.
 * Satori does not reflow or auto-fit, so the size is picked here instead.
 */
function headingSize(heading: string): number {
  if (heading.length <= 34) return 82;
  if (heading.length <= 58) return 68;
  if (heading.length <= 84) return 56;
  return 46;
}

export function ogCard({
  heading,
  footnote,
}: {
  /** The one line the card exists to show. */
  heading: string;
  /** Bottom-left context. The domain always sits bottom-right. */
  footnote: string;
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(900px 600px at 12% -10%, #16307a 0%, #0a0b0f 62%)",
          color: "#f5f7fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#4d8bff",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8a909c",
            }}
          >
            BlueX
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: headingSize(heading),
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          {heading}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 26,
            color: "#8a909c",
          }}
        >
          <div style={{ display: "flex" }}>{footnote}</div>
          <div style={{ display: "flex", color: "#4d8bff" }}>
            {SITE_URL.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
