import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';

/** Seed the 12 construction offerings (docs/DOMAIN-MODEL.md §Service Catalog). Idempotent by slug. */
const OFFERINGS: Array<[string, string]> = [
  ['Home Construction', 'Turnkey homes, foundation to handover'],
  ['Aluminium Work', 'Precision aluminium doors, windows & facades'],
  ['Glass Work', 'Toughened glass, glazing & partitions'],
  ['ACP Cladding', 'Aluminium composite panel exteriors'],
  ['False Ceiling', 'Gypsum & POP ceilings with cove lighting'],
  ['Modular Kitchen', 'Bespoke modular kitchens & storage'],
  ['Interior Design', 'End-to-end interior craftsmanship'],
  ['Exterior Design', 'Elevations, landscapes & facades'],
  ['Steel Fabrication', 'Structural & decorative steel fabrication'],
  ['Railings', 'Steel, glass & MS railings'],
  ['Renovation', 'Remodels, restorations & upgrades'],
  ['Commercial Projects', 'Offices, retail & commercial fit-outs'],
];

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main(): Promise<void> {
  const url = process.env.SERVICE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('SERVICE_DATABASE_URL (or DATABASE_URL) must be set');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  let order = 0;
  for (const [name, tagline] of OFFERINGS) {
    const slug = slugify(name);
    await prisma.serviceOffering.upsert({
      where: { slug },
      update: { name, tagline, order, active: true },
      create: {
        id: randomUUID(),
        slug,
        name,
        tagline,
        description: `${name} — full-solution delivery by Fardeen.`,
        icon: slug,
        order,
        active: true,
        features: {
          create: [
            { id: randomUUID(), title: 'Consultation & design', description: '', order: 0 },
            { id: randomUUID(), title: 'Execution & handover', description: '', order: 1 },
          ],
        },
      },
    });
    order += 1;
  }

  const count = await prisma.serviceOffering.count();
  // eslint-disable-next-line no-console
  console.log(`seeded ${count} service offerings`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
