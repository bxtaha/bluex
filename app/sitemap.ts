import type { MetadataRoute } from "next";
import { readPublishedSlugs } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

/**
 * The marketing page's sections are anchors on it rather than routes, so they
 * are still not listed — telling a crawler about `/#services` describes a page
 * that does not exist. The blog is different: every post is a real URL.
 *
 * Regenerated on the same minute as the pages, so a newly published post is
 * discoverable without a deploy.
 *
 * The number below is a literal because Next parses segment config exports
 * statically, before any module is evaluated — `export const revalidate =
 * BLOG_REVALIDATE` fails the build with "Invalid segment configuration
 * export". The shared constant still exists in `lib/blog.ts` for the places
 * that are ordinary code.
 */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const base: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const posts = await readPublishedSlugs();
    return [
      ...base,
      ...posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        // The last edit, not the publication date: this is what tells a crawler
        // a page it has already seen is worth fetching again.
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    // A sitemap listing the two pages we are certain about beats a 500, which
    // some crawlers treat as a reason to stop asking for a while.
    console.error("[sitemap] could not list posts:", error);
    return base;
  }
}
