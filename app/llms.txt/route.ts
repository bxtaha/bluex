import { readPublishedPosts } from "@/lib/blog";
import {
  CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

/**
 * `/llms.txt` — the site, described for something that reads rather than
 * crawls.
 *
 * A sitemap answers "which URLs exist". This answers "what is here and what is
 * it for", which is the question an assistant is actually holding when someone
 * asks it about this company. The format is the llmstxt.org convention:
 * an H1, a blockquote summary, prose, then link lists under H2s.
 *
 * Generated rather than checked in as a static file, for the same reason
 * `sitemap.ts` and `blog/rss.xml` are: a post published from the admin panel
 * has to appear here without anyone running a deploy.
 *
 * The number below is a literal because Next parses segment config exports
 * statically, before any module is evaluated — `export const revalidate =
 * BLOG_REVALIDATE` fails the build with "Invalid segment configuration
 * export". The shared constant still exists in `lib/blog.ts` for the places
 * that are ordinary code.
 */
export const revalidate = 60;

/**
 * Flattens a value onto one line.
 *
 * Every entry in this format is `- [name](url): description`, one per line, so
 * a newline inside an excerpt would split one post into two malformed rows.
 * Admin-authored excerpts are ordinary prose and will eventually contain one.
 */
function line(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The anchors worth naming.
 *
 * These are sections of the one marketing page, not separate documents, and
 * they are listed here — unlike in `sitemap.ts`, which deliberately omits them
 * — because the two files answer different questions. A crawler told about
 * `/#pricing` would index the same page five times. A reader asking "where
 * does BlueX list its prices" is better off pointed at the fragment than at
 * the top of a long page.
 */
const SECTIONS: { anchor: string; label: string; what: string }[] = [
  {
    anchor: "services",
    label: "What we build",
    what: "The two services: custom websites and e-commerce, and AI voice agents.",
  },
  {
    anchor: "how-it-works",
    label: "How it works",
    what: "What happens between a form submission and the phone ringing.",
  },
  {
    anchor: "experience",
    label: "Try the agent",
    what: "A form that has the agent call you, so you hear it rather than read about it.",
  },
  {
    anchor: "process",
    label: "Process",
    what: "How an engagement runs, start to handover.",
  },
  {
    anchor: "outcomes",
    label: "Outcomes",
    what: "What clients got out of it.",
  },
  {
    anchor: "why-bluex",
    label: "Why BlueX",
    what: "Custom builds rather than templates, and why that is the pitch.",
  },
  {
    anchor: "work",
    label: "Selected work",
    what: "Projects delivered.",
  },
  {
    anchor: "pricing",
    label: "Pricing",
    what: "What the tiers cost and what is in each.",
  },
  {
    anchor: "contact",
    label: "Contact",
    what: `Callback form, contact form, and ${CONTACT_EMAIL}.`,
  },
];

export async function GET() {
  const parts: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    line(`${SITE_NAME} sells two things: custom websites and e-commerce builds,
      and AI voice agents that ring a new lead within five minutes of them
      asking. The agents answer inbound calls as well. Clients are in the UAE,
      Saudi Arabia, Qatar, Canada and Australia.`),
    "",
    line(`The marketing site is a single page. Everything a visitor reads lives
      at the root URL, and the entries under "On the main page" below are
      anchors on that one page rather than separate documents — they resolve,
      but they are all the same page. The blog is different: every post is a
      real URL.`),
    "",
    "## Pages",
    "",
    `- [Home](${SITE_URL}/): ${line(
      `The whole marketing site — what ${SITE_NAME} does, how the five-minute
       callback works, pricing, and the forms that start a conversation.`,
    )}`,
    `- [Blog](${SITE_URL}/blog): Writing on lead response time, AI voice agents, and building for the web.`,
    "",
    "## On the main page",
    "",
    ...SECTIONS.map(
      ({ anchor, label, what }) => `- [${label}](${SITE_URL}/#${anchor}): ${what}`,
    ),
    "",
  ];

  try {
    // Twenty, matching the feed. Beyond that this stops being a description of
    // the site and becomes an archive dump, which is the opposite of what a
    // limited context window wants.
    const { posts } = await readPublishedPosts({ perPage: 20, page: 1 });

    if (posts.length > 0) {
      parts.push("## Blog posts", "");
      for (const post of posts) {
        const summary = line(post.excerpt);
        parts.push(
          `- [${line(post.title)}](${SITE_URL}/blog/${post.slug})${summary ? `: ${summary}` : ""}`,
        );
      }
      parts.push("");
    }
  } catch (error) {
    // The pages above are true whether or not Mongo answered. Serving them
    // beats a 500, which tells a reader nothing about the site at all.
    console.error("[llms.txt] could not list posts:", error);
  }

  parts.push(
    "## Optional",
    "",
    `- [RSS feed](${SITE_URL}/blog/rss.xml): The twenty most recent posts, as XML.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml): Every indexable URL. Shorter than this file — it omits the anchors above, because they are one page rather than nine.`,
    "",
    line(`Not listed anywhere here: the admin panel at /admin and everything
      under /api/. They are not pages, they require credentials, and there is
      nothing in them to read.`),
    "",
  );

  return new Response(parts.join("\n"), {
    headers: {
      // `charset` stated: the copy contains em dashes, and a reader that
      // guesses latin-1 renders them as mojibake.
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
