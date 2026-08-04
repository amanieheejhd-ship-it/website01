import { PrismaClient } from '../generated/client';

/** Seed Asset rows whose ids match the media reference ids already seeded in project/cms, so the
 *  gateway's resolveMany composition has something to resolve. (Bytes are not uploaded — presigned
 *  URLs are still generated; ids are the point.) Idempotent. */
interface Seed {
  id: string;
  context: 'project' | 'cms';
  mime: string;
  ext: string;
}
const ASSETS: Seed[] = [
  { id: 'media-skyline-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-courtyard-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-glass-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-penthouse-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-kitchen-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-hq-cover', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'skyline-villa-gal-1', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'skyline-villa-gal-2', context: 'project', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-hero-video', context: 'cms', mime: 'video/mp4', ext: 'mp4' },
  { id: 'media-villa-glb', context: 'cms', mime: 'model/gltf-binary', ext: 'glb' },
  { id: 'media-og-home', context: 'cms', mime: 'image/png', ext: 'png' },
  { id: 'media-avatar-ravi', context: 'cms', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'media-avatar-anita', context: 'cms', mime: 'image/jpeg', ext: 'jpg' },
];

async function main(): Promise<void> {
  const url = process.env.MEDIA_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('MEDIA_DATABASE_URL (or DATABASE_URL) must be set');
  const bucket = process.env.MINIO_BUCKET ?? 'fardeen-media';
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  for (const a of ASSETS) {
    const objectKey = `${a.context}/${a.id}.${a.ext}`;
    await prisma.asset.upsert({
      where: { id: a.id },
      update: { status: 'ready' },
      create: {
        id: a.id,
        bucket,
        objectKey,
        mime: a.mime,
        size: 0,
        checksum: '',
        ownerContext: a.context,
        ownerId: null,
        variants: [{ kind: 'thumb', objectKey: `${a.context}/${a.id}-thumb.webp` }],
        status: 'ready',
      },
    });
  }

  const count = await prisma.asset.count();
  // eslint-disable-next-line no-console
  console.log(`seeded ${ASSETS.length} assets (total ${count})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
