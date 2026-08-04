import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';

/** Seed a couple of contact submissions (idempotent by idempotencyKey). */
const SUBMISSIONS = [
  { key: 'seed-contact-1', name: 'Priya Sharma', email: 'priya@example.com', phone: '+919812345678', subject: 'Villa construction enquiry', message: 'We want to build a 4BHK villa in Hyderabad.', status: 'new' },
  { key: 'seed-contact-2', name: 'Arjun Nair', email: 'arjun@example.com', phone: '+919898989898', subject: 'Modular kitchen quote', message: 'Please share a quote for a modular kitchen.', status: 'read' },
];

async function main(): Promise<void> {
  const url = process.env.CONTACT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('CONTACT_DATABASE_URL (or DATABASE_URL) must be set');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  for (const s of SUBMISSIONS) {
    await prisma.contactSubmission.upsert({
      where: { idempotencyKey: s.key },
      update: { status: s.status },
      create: {
        id: randomUUID(),
        name: s.name,
        email: s.email,
        phone: s.phone,
        subject: s.subject,
        message: s.message,
        source: 'seed',
        idempotencyKey: s.key,
        status: s.status,
      },
    });
  }

  const count = await prisma.contactSubmission.count();
  // eslint-disable-next-line no-console
  console.log(`seeded ${SUBMISSIONS.length} contact submissions (total ${count})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
