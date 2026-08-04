import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';

/** Seed a couple of quotation requests (one 'quoted' with line items to show total derivation).
 *  Idempotent by idempotencyKey. */
async function main(): Promise<void> {
  const url = process.env.QUOTATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('QUOTATION_DATABASE_URL (or DATABASE_URL) must be set');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  await prisma.quotationRequest.upsert({
    where: { idempotencyKey: 'seed-quote-1' },
    update: { status: 'requested' },
    create: {
      id: randomUUID(),
      contactName: 'Kavya Reddy',
      contactEmail: 'kavya@example.com',
      contactPhone: '+919811112222',
      serviceSlugs: ['home-construction', 'interior-design'],
      projectType: 'New villa',
      budgetMin: 5000000,
      budgetMax: 8000000,
      budgetCurrency: 'INR',
      timeline: '9-12 months',
      details: 'Full villa build with interiors.',
      attachments: ['media-skyline-cover'],
      status: 'requested',
      idempotencyKey: 'seed-quote-1',
    },
  });

  await prisma.quotationRequest.upsert({
    where: { idempotencyKey: 'seed-quote-2' },
    update: { status: 'quoted' },
    create: {
      id: randomUUID(),
      contactName: 'Imran Ali',
      contactEmail: 'imran@example.com',
      contactPhone: '+919833334444',
      serviceSlugs: ['modular-kitchen'],
      projectType: 'Kitchen',
      budgetMin: 300000,
      budgetMax: 500000,
      budgetCurrency: 'INR',
      timeline: '2 months',
      details: 'L-shaped modular kitchen.',
      attachments: [],
      status: 'quoted',
      idempotencyKey: 'seed-quote-2',
      lineItems: {
        create: [
          { id: randomUUID(), label: 'Cabinetry', qty: 1, unitPrice: 250000, currency: 'INR' },
          { id: randomUUID(), label: 'Countertop (sqft)', qty: 40, unitPrice: 3500, currency: 'INR' },
        ],
      },
    },
  });

  const count = await prisma.quotationRequest.count();
  // eslint-disable-next-line no-console
  console.log(`seeded quotation requests (total ${count})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
