import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EVENT_PUBLISHER } from '../application/ports/event-publisher.port';
import { ListContacts } from '../application/use-cases/list-contacts.use-case';
import { SetContactStatus } from '../application/use-cases/set-contact-status.use-case';
import { SubmitContact } from '../application/use-cases/submit-contact.use-case';
import { CONTACT_REPOSITORY } from '../domain/repositories/contact.repository';
import { ContactController } from '../presentation/contact.controller';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { PrismaContactRepository } from './prisma/contact.repository.impl';
import { PrismaService } from './prisma/prisma.service';
import { RedisEventPublisher } from './redis/event-publisher.impl';
import { REDIS_CLIENT } from './redis/redis.tokens';

@Module({
  controllers: [ContactController],
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
    { provide: CONTACT_REPOSITORY, useClass: PrismaContactRepository },
    { provide: EVENT_PUBLISHER, useFactory: (r: Redis) => new RedisEventPublisher(r), inject: [REDIS_CLIENT] },

    { provide: SubmitContact, useFactory: (repo, e) => new SubmitContact(repo, e), inject: [CONTACT_REPOSITORY, EVENT_PUBLISHER] },
    { provide: ListContacts, useFactory: (repo) => new ListContacts(repo), inject: [CONTACT_REPOSITORY] },
    { provide: SetContactStatus, useFactory: (repo) => new SetContactStatus(repo), inject: [CONTACT_REPOSITORY] },
  ],
})
export class ContactModule {}
