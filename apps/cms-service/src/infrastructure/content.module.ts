import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { GetPage } from '../application/use-cases/get-page.use-case';
import { ListPages } from '../application/use-cases/list-pages.use-case';
import { ListTestimonials } from '../application/use-cases/list-testimonials.use-case';
import { PublishPage } from '../application/use-cases/publish-page.use-case';
import { UpdatePage } from '../application/use-cases/update-page.use-case';
import {
  PAGE_REPOSITORY,
  TESTIMONIAL_REPOSITORY,
} from '../domain/repositories/cms.repository';
import { ContentController } from '../presentation/content.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import {
  PrismaPageRepository,
  PrismaTestimonialRepository,
} from './prisma/cms.repository.impl';
import { PrismaService } from './prisma/prisma.service';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

@Module({
  controllers: [ContentController],
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
        new Redis({
          host: cfg.redisHost,
          port: cfg.redisPort,
          password: cfg.redisPassword,
          maxRetriesPerRequest: null,
        }),
      inject: [APP_CONFIG],
    },
    { provide: PAGE_REPOSITORY, useClass: PrismaPageRepository },
    { provide: TESTIMONIAL_REPOSITORY, useClass: PrismaTestimonialRepository },
    { provide: EVENT_PUBLISHER, useFactory: (r: Redis) => new RedisEventPublisher(r), inject: [REDIS_CLIENT] },

    { provide: GetPage, useFactory: (p) => new GetPage(p), inject: [PAGE_REPOSITORY] },
    { provide: ListPages, useFactory: (p) => new ListPages(p), inject: [PAGE_REPOSITORY] },
    { provide: UpdatePage, useFactory: (p) => new UpdatePage(p), inject: [PAGE_REPOSITORY] },
    { provide: ListTestimonials, useFactory: (r) => new ListTestimonials(r), inject: [TESTIMONIAL_REPOSITORY] },
    { provide: PublishPage, useFactory: (p, e) => new PublishPage(p, e), inject: [PAGE_REPOSITORY, EVENT_PUBLISHER] },
  ],
})
export class ContentModule {}
