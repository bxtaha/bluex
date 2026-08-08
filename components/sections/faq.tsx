import { getVisibleFaqs } from "@/lib/faq";
import { FaqAccordion } from "@/components/sections/faq-accordion";

/**
 * Serialises JSON-LD for injection into a `<script>` tag.
 *
 * `JSON.stringify` escapes quotes but not `<`, so an answer containing
 * `</script>` would close the tag early and drop the rest of the document into
 * the page as markup. That is a script-injection hole, and unlike the site's
 * other JSON-LD — a literal in the source — this content is typed into the
 * admin panel, so it is input and gets treated as such.
 *
 * `<` is the same character to a JSON parser and inert to an HTML one.
 */
function serialiseJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * FAQ.
 *
 * A server component: the questions are read on the server, so they are in the
 * HTML for both the reader and the crawler. The structured data below is built
 * from the same array the accordion renders, which is what stops the two
 * drifting — a rich result advertising a question the page no longer shows is
 * worse than none.
 */
export async function Faq() {
  const faqs = await getVisibleFaqs();

  // Hiding every question is a thing an admin can do, and a heading with no
  // list under it looks broken.
  if (faqs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />
      <FaqAccordion faqs={faqs} />
    </>
  );
}
