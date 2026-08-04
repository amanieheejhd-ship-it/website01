import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/client';

/**
 * Seed one initial admin so the login flow can be tested.
 *   AUTH_DATABASE_URL=... npx ts-node apps/auth-service/prisma/seed.ts
 * Idempotent (upsert). Override SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD via env.
 */
async function main(): Promise<void> {
  const url = process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('AUTH_DATABASE_URL (or DATABASE_URL) must be set');

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@fardeen.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', status: 'active' },
    create: { id: randomUUID(), email, passwordHash, role: 'admin', status: 'active' },
  });

  // eslint-disable-next-line no-console
  console.log(`seeded admin: ${user.email} (role=${user.role})  password=${password}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
