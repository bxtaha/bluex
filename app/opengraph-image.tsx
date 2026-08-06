import { ImageResponse } from "next/og";
import { SITE_TAGLINE, SITE_URL } from "@/lib/site";

/**
 * The card that appears when the site is pasted into a chat or a timeline.
 *
 * Drawn at build time by next/og rather than shipped as a PNG, so the wording
 * cannot drift from the copy it is quoting. No webfont is loaded: the fonts
 * here are self-hosted woff2 meant for a browser, and fetching them at build
 * time to render one image costs more than the system stack is worth.
 */
export const alt = `BlueX — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
            fontSize: 82,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          {`${SITE_TAGLINE}.`}
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
          <div style={{ display: "flex" }}>
            AI voice agents · Web &amp; e-commerce
          </div>
          <div style={{ display: "flex", color: "#4d8bff" }}>
            {SITE_URL.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
