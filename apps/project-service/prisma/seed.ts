import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';

/** Seed categories + a portfolio (mix of published/draft/featured). Idempotent by slug.
 *  Media ids are stored as plain reference strings (unresolved until 4b-2). */
const CATEGORIES: Array<[string, string, number]> = [
  ['home-construction', 'Home Construction', 0],
  ['interior', 'Interior', 1],
  ['commercial', 'Commercial', 2],
];

interface Seed {
  slug: string;
  title: string;
  category: string;
  status: 'draft' | 'published';
  featured: boolean;
  year: number;
  location: string;
  cover: string | null;
}
const PROJECTS: Seed[] = [
  { slug: 'skyline-villa', title: 'Skyline Villa', category: 'home-construction', status: 'published', featured: true, year: 2024, location: 'Hyderabad', cover: 'media-skyline-cover' },
  { slug: 'courtyard-house', title: 'Courtyard House', category: 'home-construction', status: 'published', featured: false, year: 2023, location: 'Pune', cover: 'media-courtyard-cover' },
  { slug: 'glass-pavilion', title: 'Glass Pavilion', category: 'home-construction', status: 'published', featured: false, year: 2023, location: 'Bengaluru', cover: 'media-glass-cover' },
  { slug: 'penthouse-interior', title: 'Penthouse Interior', category: 'interior', status: 'published', featured: true, year: 2024, location: 'Mumbai', cover: 'media-penthouse-cover' },
  { slug: 'modular-kitchen-suite', title: 'Modular Kitchen Suite', category: 'interior', status: 'published', featured: false, year: 2024, location: 'Chennai', cover: 'media-kitchen-cover' },
  { slug: 'corporate-hq', title: 'Corporate HQ', category: 'commercial', status: 'published', featured: false, year: 2022, location: 'Gurugram', cover: 'media-hq-cover' },
  { slug: 'retail-flagship', title: 'Retail Flagship (WIP)', category: 'commercial', status: 'draft', featured: false, year: 2025, location: 'Delhi', cover: null },
];

async function main(): Promise<void> {
  const url = process.env.PROJECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('PROJECT_DATABASE_URL (or DATABASE_URL) must be set');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const catIds: Record<string, string> = {};
  for (const [slug, name, order] of CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { slug },
      update: { name, order },
      create: { id: randomUUID(), slug, name, order },
    });
    catIds[slug] = c.id;
  }

  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: { title: p.title, status: p.status, featured: p.featured },
      create: {
        id: randomUUID(),
        slug: p.slug,
        title: p.title,
        summary: `${p.title} — an Ansari Space Craft build in ${p.location}.`,
        body: `Full case study for ${p.title}.`,
        categoryId: catIds[p.category],
        location: p.location,
        year: p.year,
        coverMediaId: p.cover,
        galleryMediaIds: p.cover ? [`${p.slug}-gal-1`, `${p.slug}-gal-2`] : [],
        status: p.status,
        featured: p.featured,
        metricsArea: '3200 sqft',
        metricsDurationMonths: 9,
      },
    });
  }

  const published = await prisma.project.count({ where: { status: 'published' } });
  const drafts = await prisma.project.count({ where: { status: 'draft' } });
  // eslint-disable-next-line no-console
  console.log(`seeded ${CATEGORIES.length} categories, ${published} published + ${drafts} draft projects`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
