import type { MetadataRoute } from "next";
import { CATEGORY_SLUGS, PREF_SLUGS, getPublishedArticles, getPublishedClinics } from "@/lib/data";
import { siteUrl } from "@/lib/cron-auth";
import { YAMANOTE } from "@/lib/yamanote";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, clinics] = await Promise.all([getPublishedArticles(1000), getPublishedClinics()]);
  const now = new Date();
  return [
    { url: siteUrl("/"), lastModified: now, priority: 1 },
    { url: siteUrl("/diagnosis"), lastModified: now, priority: 0.9 },
    { url: siteUrl("/consult"), lastModified: now, priority: 0.9 },
    { url: siteUrl("/articles"), lastModified: now },
    ...Object.keys(PREF_SLUGS).flatMap((p) =>
      Object.keys(CATEGORY_SLUGS).map((t) => ({ url: siteUrl(`/area/${p}/${t}`), lastModified: now, priority: 0.8 })),
    ),
    ...YAMANOTE.map((s) => ({ url: siteUrl(`/station/${s.slug}`), lastModified: now, priority: 0.8 })),
    ...articles.map((a) => ({ url: siteUrl(`/articles/${a.slug}`), lastModified: new Date(a.updated_at) })),
    ...clinics.map((c) => ({ url: siteUrl(`/clinics/${c.slug}`), lastModified: now, priority: 0.6 })),
  ];
}
