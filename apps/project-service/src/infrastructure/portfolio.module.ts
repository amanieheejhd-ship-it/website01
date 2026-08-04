import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { CreateProject } from '../application/use-cases/create-project.use-case';
import { GetProjectById } from '../application/use-cases/get-project-by-id.use-case';
import { GetProjectBySlug } from '../application/use-cases/get-project-by-slug.use-case';
import { ListCategories } from '../application/use-cases/list-categories.use-case';
import { ListProjects } from '../application/use-cases/list-projects.use-case';
import { RemoveProject } from '../application/use-cases/remove-project.use-case';
import { UpdateProject } from '../application/use-cases/update-project.use-case';
import {
  CATEGORY_REPOSITORY,
  PROJECT_REPOSITORY,
} from '../domain/repositories/project.repository';
import { PortfolioController } from '../presentation/portfolio.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { PrismaService } from './prisma/prisma.service';
import {
  PrismaCategoryRepository,
  PrismaProjectRepository,
} from './prisma/project.repository.impl';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

@Module({
  controllers: [PortfolioController],
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
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: EVENT_PUBLISHER, useFactory: (r: Redis) => new RedisEventPublisher(r), inject: [REDIS_CLIENT] },

    { provide: ListProjects, useFactory: (r) => new ListProjects(r), inject: [PROJECT_REPOSITORY] },
    { provide: GetProjectBySlug, useFactory: (r) => new GetProjectBySlug(r), inject: [PROJECT_REPOSITORY] },
    { provide: GetProjectById, useFactory: (r) => new GetProjectById(r), inject: [PROJECT_REPOSITORY] },
    { provide: ListCategories, useFactory: (c) => new ListCategories(c), inject: [CATEGORY_REPOSITORY] },
    {
      provide: CreateProject,
      useFactory: (r, c, e) => new CreateProject(r, c, e),
      inject: [PROJECT_REPOSITORY, CATEGORY_REPOSITORY, EVENT_PUBLISHER],
    },
    { provide: UpdateProject, useFactory: (r, e) => new UpdateProject(r, e), inject: [PROJECT_REPOSITORY, EVENT_PUBLISHER] },
    { provide: RemoveProject, useFactory: (r) => new RemoveProject(r), inject: [PROJECT_REPOSITORY] },
  ],
})
export class PortfolioModule {}
