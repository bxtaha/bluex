import { BLOG_REVALIDATE, readPublishedPosts } from "@/lib/blog";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * RSS 2.0.
 *
 * A static segment, so it wins over `[slug]` in the router — `/blog/rss.xml` is
 * the feed, never a post that happens to be called that. Revalidated on the
 * same minute as the pages so a new post reaches the feed at the same time it
 * reaches the site.
 *
 * The number below is a literal because Next parses segment config exports
 * statically, before any module is evaluated — `export const revalidate =
 * BLOG_REVALIDATE` fails the build with "Invalid segment configuration
 * export". The shared constant still exists in `lib/blog.ts` for the places
 * that are ordinary code.
 */
export const revalidate = 60;

/**
 * XML text escaping.
 *
 * Five characters, and all five matter: an unescaped `&` in a title makes the
 * whole document malformed, and a reader that hits a parse error shows the feed
 * as broken rather than showing the other nineteen items. `'` is escaped
 * numerically because `&apos;` is XML but not HTML, and feed readers vary in
 * which parser they hand this to.
 */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET() {
  let items = "";
  let updated = new Date();

  try {
    // The most recent twenty. A feed is a "what's new" list, not an archive —
    // readers fetch it repeatedly and only ever act on the top of it.
    const { posts } = await readPublishedPosts({ perPage: 20, page: 1 });
    if (posts[0]?.publishedAt) updated = new Date(posts[0].publishedAt);

    items = posts
      .map((post) => {
        const url = `${SITE_URL}/blog/${post.slug}`;
        return [
          "    <item>",
          `      <title>${xml(post.title)}</title>`,
          `      <link>${xml(url)}</link>`,
          // `isPermaLink="false"` because the guid is an identity, not an
          // address — a reader that treats it as a URL will refetch every item
          // whenever a slug changes.
          `      <guid isPermaLink="false">${xml(url)}</guid>`,
          `      <description>${xml(post.excerpt)}</description>`,
          post.publishedAt
            ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`
            : "",
          post.category ? `      <category>${xml(post.category)}</category>` : "",
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
  } catch (error) {
    // An empty but well-formed feed, rather than a 500. A reader that gets an
    // error often enough stops asking.
    console.error("[blog] could not build the feed:", error);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${SITE_NAME} — Writing`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${xml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": `public, max-age=0, s-maxage=${BLOG_REVALIDATE}, stale-while-revalidate=600`,
    },
  });
}
