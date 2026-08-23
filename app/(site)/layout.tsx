import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { LeadFormProvider } from "@/components/providers/lead-form-provider";
import { SectionProvider } from "@/components/providers/section-provider";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { BackToTop } from "@/components/ui/back-to-top";
import { SectionNav } from "@/components/ui/section-nav";
import { SplashCursorMount } from "@/components/ui/splash-cursor-mount";
import { SiteHeader } from "@/components/site-header";
import { getContactSettings } from "@/lib/contact";
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/**
 * Structured data. Emitted as a script tag rather than through `metadata`,
 * which has no field for it.
 *
 * Google's Rich Results Test confirms this as one valid item eligible for a
 * Local Business rich result, and named `telephone` and `image` among the
 * optional fields it was missing. Both are filled in below — the phone from the
 * same admin-editable settings the contact section renders, so the number a
 * search result offers to dial and the number on the page cannot disagree.
 *
 * `priceRange` is deliberately absent. It is free text and Google accepts
 * anything from "$$" to a figure, but every tier on the pricing section says
 * "get a quote" rather than a number — a price band in the structured data
 * that the page itself will not state is a claim made only to a crawler. The
 * field is optional and the item stays valid without it.
 */
function buildJsonLd(telephone: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    email: CONTACT_EMAIL,
    // The logo rather than the Open Graph card. Both are images of the brand,
    // but the OG file is served through a content-hashed URL that changes
    // whenever the image does, and a structured-data field pointing at a URL
    // that moves is one that will eventually 404 in someone's search result.
    image: `${SITE_URL}/bluex-logo.png`,
    logo: `${SITE_URL}/bluex-logo.png`,
    // Digits and a leading `+` only. The stored value is formatted for reading
    // ("+1 240 820 3149"); schema.org wants it dialable.
    ...(telephone ? { telephone: telephone.replace(/[^\d+]/g, "") } : {}),
    // The registered office. `addressRegion` is omitted rather than guessed —
    // London is its own thing and the county line on the record is blank.
    address: {
      "@type": "PostalAddress",
      streetAddress: "128 City Road",
      addressLocality: "London",
      postalCode: "EC1V 2NX",
      // ISO 3166-1 alpha-2, which is what `areaServed` above already uses.
      addressCountry: "GB",
    },
    // The five markets the trust strip names. Listing two of them here while
    // the copy claims five is the kind of contradiction a crawler can see.
    areaServed: ["AE", "SA", "QA", "CA", "AU"],
    serviceType: [
      "AI voice agents — outbound lead callback",
      "AI voice agents — inbound call answering",
      "Web design and development",
      "E-commerce development",
    ],
  };
}

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
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Cached and tagged, and the contact section on the home page reads the same
  // entry — so this is a shared cache hit rather than a second round trip.
  const { phone } = await getContactSettings();

  return (
    <>
      <script
        type="application/ld+json"
        // The only value reaching this from outside the file is the phone
        // number, and it is stripped to digits and a `+` before it gets here —
        // `JSON.stringify` handles the rest.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(phone)) }}
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
