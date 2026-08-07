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
  SITE_URL,
} from "@/lib/site";

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

/**
 * Everything that makes the marketing site the marketing site.
 *
 * This all used to live in the root layout, which meant every route in the app
 * got Lenis, the header, the dock, the scroll progress bar and the fluid cursor
 * whether it wanted them or not. A route group moves them down one level: the
 * URLs are unchanged — `(site)` contributes no path segment — but the admin
 * area, which is a different application wearing a different skin, no longer
 * inherits a smooth-scroll driver and a marketing navigation.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        // The value is a literal defined in this file, not anything a request
        // can reach — there is no input here to escape.
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

      {/* Last in the body and outside the providers: it reads no section state
          and owns no layout, so it is only ever a layer. Its z-index (30, set
          in globals.css) is what puts it over the page and under every control,
          not its position here. */}
      <SplashCursorMount />
    </>
  );
}
