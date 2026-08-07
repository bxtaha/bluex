import type { Metadata, Viewport } from "next";
import { clashDisplay, generalSans } from "@/lib/fonts";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { LeadFormProvider } from "@/components/providers/lead-form-provider";
import { SectionProvider } from "@/components/providers/section-provider";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { BackToTop } from "@/components/ui/back-to-top";
import { SectionNav } from "@/components/ui/section-nav";
import { SplashCursorMount } from "@/components/ui/splash-cursor-mount";
import { SiteHeader } from "@/components/site-header";
import {
  CONTACT_EMAIL,
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

/**
 * Structured data. Emitted as a script tag rather than through `metadata`,
 * which has no field for it.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  email: CONTACT_EMAIL,
  areaServed: ["AE", "CA"],
  serviceType: [
    "AI voice agents",
    "Web design and development",
    "E-commerce development",
  ],
} as const;

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
      <body className="bg-void text-ink">
        <script
          type="application/ld+json"
          // The value is a literal defined in this file, not anything a
          // request can reach — there is no input here to escape.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Fixed gradient wash + grain behind every section, so the near-black
            never reads as flat. */}
        <div className="bx-atmosphere" aria-hidden />

        <SmoothScroll />

        {/* Wraps the header and the dock both: they highlight the same current
            section, and one observer between them is what keeps them agreeing. */}
        <SectionProvider>
          <LeadFormProvider>
            <SiteHeader />
            <main className="relative z-10">{children}</main>
          </LeadFormProvider>

          {/* Fixed overlays, so they add nothing to layout and cannot shift
              content. Outside <main> because none is page content. */}
          <ScrollProgress />
          <SectionNav />
          <BackToTop />
        </SectionProvider>

        {/* Last in the body and outside the providers: it reads no section
            state and owns no layout, so it is only ever a layer. Its z-index
            (30, set in globals.css) is what puts it over the page and under
            every control, not its position here. */}
        <SplashCursorMount />
      </body>
    </html>
  );
}
