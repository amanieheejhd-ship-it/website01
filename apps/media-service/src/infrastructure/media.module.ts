import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { MEDIA_STORE } from '../application/ports/media-store.port';
import { GetAsset } from '../application/use-cases/get-asset.use-case';
import { PresignUpload } from '../application/use-cases/presign-upload.use-case';
import { ResolveMany } from '../application/use-cases/resolve-many.use-case';
import { ASSET_REPOSITORY } from '../domain/repositories/asset.repository';
import { MediaController } from '../presentation/media.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { MinioMediaStore } from './minio/minio.store';
import { PrismaAssetRepository } from './prisma/asset.repository.impl';
import { PrismaService } from './prisma/prisma.service';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

@Module({
  controllers: [MediaController],
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    {
      provide: PrismaService,
      useFactory: (cfg: AppConfig) => new PrismaService(cfg.databaseUrl),
      inject: [APP_CONFIG],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (cfg: AppConfig) =>
        new Redis({ host: cfg.redisHost, port: cfg.redisPort, password: cfg.redisPassword, maxRetriesPerRequest: null }),
      inject: [APP_CONFIG],
    },
    {
      provide: MEDIA_STORE,
      useFactory: async (cfg: AppConfig) => {
        const store = new MinioMediaStore(cfg.minio);
        await store.ensureBucket();
        return store;
      },
      inject: [APP_CONFIG],
    },
    { provide: ASSET_REPOSITORY, useClass: PrismaAssetRepository },
    { provide: EVENT_PUBLISHER, useFactory: (r: Redis) => new RedisEventPublisher(r), inject: [REDIS_CLIENT] },

    { provide: PresignUpload, useFactory: (repo, store) => new PresignUpload(repo, store), inject: [ASSET_REPOSITORY, MEDIA_STORE] },
    { provide: GetAsset, useFactory: (repo, store, e) => new GetAsset(repo, store, e), inject: [ASSET_REPOSITORY, MEDIA_STORE, EVENT_PUBLISHER] },
    { provide: ResolveMany, useFactory: (repo, store) => new ResolveMany(repo, store), inject: [ASSET_REPOSITORY, MEDIA_STORE] },
  ],
})
export class MediaModule {}
