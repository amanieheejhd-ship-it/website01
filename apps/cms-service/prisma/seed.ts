import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';

/** Seed a published "home" page (ordered sections) + testimonials. Idempotent. Media refs are
 *  plain reference ids (unresolved until 4b-2). */
const SECTIONS = [
  { type: 'hero', order: 0, payload: { headline: 'We build the moment you walk in', sub: 'From empty land to a finished luxury villa.' }, mediaRefs: ['media-hero-video'] },
  { type: 'scene', order: 1, payload: { scene: 'villa-reveal', durationScroll: 1 }, mediaRefs: ['media-villa-glb'] },
  { type: 'richText', order: 2, payload: { html: '<p>Full-solution construction — foundation to finish.</p>' }, mediaRefs: [] },
  { type: 'cta', order: 3, payload: { label: 'Start your project', href: '/contact' }, mediaRefs: [] },
];

const TESTIMONIALS = [
  { author: 'Ravi Menon', role: 'Homeowner', company: '', quote: 'They delivered our dream villa on time and on budget.', rating: 5, featured: true, avatarMediaId: 'media-avatar-ravi' },
  { author: 'Anita Rao', role: 'Director', company: 'Rao Retail', quote: 'Our flagship store looks absolutely stunning.', rating: 5, featured: true, avatarMediaId: 'media-avatar-anita' },
  { author: 'Sameer Khan', role: 'Architect', company: 'SK Studio', quote: 'Impeccable steel fabrication and finishing.', rating: 4, featured: false, avatarMediaId: null },
];

async function main(): Promise<void> {
  const url = process.env.CMS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('CMS_DATABASE_URL (or DATABASE_URL) must be set');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const page = await prisma.page.upsert({
    where: { slug: 'home' },
    update: {
      title: 'Home',
      status: 'published',
      seoTitle: 'Ansari Space Craft — We build the moment you walk in',
      seoDescription: 'Watch a luxury villa rise from empty land as you scroll.',
      seoOgImageMediaId: 'media-og-home',
    },
    create: {
      id: randomUUID(),
      slug: 'home',
      title: 'Home',
      status: 'published',
      seoTitle: 'Ansari Space Craft — We build the moment you walk in',
      seoDescription: 'Watch a luxury villa rise from empty land as you scroll.',
      seoOgImageMediaId: 'media-og-home',
    },
  });

  await prisma.section.deleteMany({ where: { pageId: page.id } });
  await prisma.section.createMany({
    data: SECTIONS.map((s) => ({
      id: randomUUID(),
      pageId: page.id,
      type: s.type,
      order: s.order,
      payload: s.payload,
      mediaRefs: s.mediaRefs,
    })),
  });

  await prisma.testimonial.deleteMany({});
  await prisma.testimonial.createMany({
    data: TESTIMONIALS.map((t) => ({ id: randomUUID(), ...t })),
  });

  // eslint-disable-next-line no-console
  console.log(`seeded page "home" (${SECTIONS.length} sections) + ${TESTIMONIALS.length} testimonials`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
