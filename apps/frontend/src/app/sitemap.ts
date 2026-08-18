import type { MetadataRoute } from 'next';
import { getProjects } from '../lib/api';
import { absoluteUrl } from '../lib/site';

/** Dynamic sitemap: static marketing routes + every published project slug. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/services'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/projects'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    // Gateway caps limit at 50 per page; page through so no published project is dropped.
    const first = await getProjects({ limit: 50, page: 1 });
    const pages = Math.max(1, Math.ceil((first.meta.total ?? first.data.length) / 50));
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => getProjects({ limit: 50, page: i + 2 })),
    );
    const data = [first, ...rest].flatMap((r) => r.data);
    const projectRoutes: MetadataRoute.Sitemap = data.map((p) => ({
      url: absoluteUrl(`/projects/${p.slug}`),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
    return [...staticRoutes, ...projectRoutes];
  } catch {
    // Backend unreachable at build/request time → still emit the static routes.
    return staticRoutes;
  }
}
