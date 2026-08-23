import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // The lead endpoint accepts POSTs and has nothing to index.
        "/api/",
        // Belt and braces with the `noindex` in the admin layout's metadata.
        // robots.txt is a request, not a control — the real gate is the session
        // check on the route — but there is no reason to advertise the door.
        "/admin",
        // Same reasoning, and one addition that is not belt and braces: the
        // setup route carries an invitation token in its query string. A crawler
        // that fetched it would put a live credential into its logs, and a
        // cached SERP snippet would keep it there after the link was used. The
        // `noindex` on the route group is the guarantee; this is what stops the
        // fetch happening in the first place.
        "/clients",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
