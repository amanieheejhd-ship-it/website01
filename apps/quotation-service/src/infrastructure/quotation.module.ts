import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { GetQuotation } from '../application/use-cases/get-quotation.use-case';
import { GetQuotationStats } from '../application/use-cases/get-quotation-stats.use-case';
import { ListQuotations } from '../application/use-cases/list-quotations.use-case';
import { RequestQuotation } from '../application/use-cases/request-quotation.use-case';
import { SetQuotationStatus } from '../application/use-cases/set-quotation-status.use-case';
import { QUOTATION_REPOSITORY } from '../domain/repositories/quotation.repository';
import { QuotationController } from '../presentation/quotation.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { PrismaQuotationRepository } from './prisma/quotation.repository.impl';
import { PrismaService } from './prisma/prisma.service';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

@Module({
  controllers: [QuotationController],
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
    { provide: QUOTATION_REPOSITORY, useClass: PrismaQuotationRepository },
    { provide: EVENT_PUBLISHER, useFactory: (r: Redis) => new RedisEventPublisher(r), inject: [REDIS_CLIENT] },

    { provide: RequestQuotation, useFactory: (repo, e) => new RequestQuotation(repo, e), inject: [QUOTATION_REPOSITORY, EVENT_PUBLISHER] },
    { provide: GetQuotation, useFactory: (repo) => new GetQuotation(repo), inject: [QUOTATION_REPOSITORY] },
    { provide: ListQuotations, useFactory: (repo) => new ListQuotations(repo), inject: [QUOTATION_REPOSITORY] },
    { provide: GetQuotationStats, useFactory: (repo) => new GetQuotationStats(repo), inject: [QUOTATION_REPOSITORY] },
    { provide: SetQuotationStatus, useFactory: (repo, e) => new SetQuotationStatus(repo, e), inject: [QUOTATION_REPOSITORY, EVENT_PUBLISHER] },
  ],
})
export class QuotationModule {}
