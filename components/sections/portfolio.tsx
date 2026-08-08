import { getFootnote, getVisibleProjects, renderFootnote } from "@/lib/projects";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { PortfolioRows } from "@/components/sections/portfolio-rows";

/**
 * Serialises JSON-LD for a `<script>` tag.
 *
 * `JSON.stringify` escapes quotes but not `<`, so a client name containing
 * `</script>` would close the tag early and drop the rest of the document into
 * the page as markup. Client names are typed into the admin panel, so they are
 * input — the same reasoning as the FAQ and blog sections.
 */
function serialiseJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Selected work.
 *
 * A server component, so the projects are in the HTML for both the reader and
 * the crawler. This is the section that has to be believable, and a grid that
 * populates after a client-side fetch is the one thing that would make it look
 * like a slideshow of stock screenshots.
 *
 * The structured data is an `ItemList` of `CreativeWork`s built from the same
 * array the cards render. Each entry carries its `url`, which is the part that
 * matters — it is what says these are real addresses rather than pictures.
 */
export async function Portfolio() {
  const [projects, footnoteTemplate] = await Promise.all([
    getVisibleProjects(),
    getFootnote(),
  ]);

  // Hiding every project is a thing an admin can do, and a heading with nothing
  // under it reads as broken on the one section that must not.
  if (projects.length === 0) return null;

  const footnote = renderFootnote(footnoteTemplate, projects.length);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Selected work — ${SITE_NAME}`,
    url: `${SITE_URL}/#work`,
    numberOfItems: projects.length,
    itemListElement: projects.map((project, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: project.clientName,
        description: project.description || undefined,
        url: project.url || undefined,
        image: project.screenshot || undefined,
        dateCreated: project.year || undefined,
        keywords: project.tags.length > 0 ? project.tags.join(", ") : undefined,
        creator: {
          "@type": "Organization",
          name: SITE_NAME,
          "@id": `${SITE_URL}#organization`,
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />
      <PortfolioRows projects={projects} footnote={footnote} />
    </>
  );
}
