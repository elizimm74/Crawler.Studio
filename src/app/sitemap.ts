// /sitemap.xml: the public pages search engines should know about.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { publishedCaseStudies } from "@/lib/caseStudies";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/example", "/example?kind=app", "/pricing", "/tools/paywall-checker", "/science", "/accuracy", "/case-studies", "/terms", "/privacy", "/refunds", ...publishedCaseStudies().map((c) => `/case-studies/${c.slug}`)];
  return pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: new Date() }));
}
