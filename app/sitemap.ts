import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * One page. The sections are anchors on it rather than routes, and listing
 * fragments as separate URLs tells a crawler about pages that do not exist.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
