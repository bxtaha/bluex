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
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
