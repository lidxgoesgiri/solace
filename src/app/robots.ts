import type { MetadataRoute } from "next";

/** Crawlers may read the public pages; the API is not for them. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
