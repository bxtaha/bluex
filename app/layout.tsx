import type { Metadata, Viewport } from "next";
import { clashDisplay, generalSans } from "@/lib/fonts";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  // Everything relative below resolves against this. Without it Next emits
  // relative Open Graph URLs, which crawlers drop rather than resolve.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    // Facebook and LinkedIn both read this and guess when it is absent. The
    // audience spans the Gulf, Canada and Australia, and the guess is made
    // from the crawler's own locale rather than the reader's.
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  // Lets the page paint under the notch and the home indicator. The fixed
  // overlays then hold themselves off both with env(safe-area-inset-*); without
  // this the insets are all zero and there is nothing to hold off from.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${clashDisplay.variable} ${generalSans.variable} antialiased`}
    >
      <body className="bg-void text-ink">{children}</body>
    </html>
  );
}
