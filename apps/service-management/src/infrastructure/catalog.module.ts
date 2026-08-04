import { Module } from '@nestjs/common';
import { GetServiceBySlug } from '../application/use-cases/get-service-by-slug.use-case';
import { ListAllServices } from '../application/use-cases/list-all-services.use-case';
import { ListServices } from '../application/use-cases/list-services.use-case';
import { UpsertService } from '../application/use-cases/upsert-service.use-case';
import { SERVICE_REPOSITORY } from '../domain/repositories/service.repository';
import { CatalogController } from '../presentation/catalog.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { PrismaService } from './prisma/prisma.service';
import { PrismaServiceRepository } from './prisma/service.repository.impl';

@Module({
  controllers: [CatalogController],
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    {
      provide: PrismaService,
      useFactory: (cfg: AppConfig) => new PrismaService(cfg.databaseUrl),
      inject: [APP_CONFIG],
    },
    { provide: SERVICE_REPOSITORY, useClass: PrismaServiceRepository },
    { provide: ListServices, useFactory: (r) => new ListServices(r), inject: [SERVICE_REPOSITORY] },
    { provide: ListAllServices, useFactory: (r) => new ListAllServices(r), inject: [SERVICE_REPOSITORY] },
    { provide: GetServiceBySlug, useFactory: (r) => new GetServiceBySlug(r), inject: [SERVICE_REPOSITORY] },
    { provide: UpsertService, useFactory: (r) => new UpsertService(r), inject: [SERVICE_REPOSITORY] },
  ],
})
export class CatalogModule {}
