import { Module } from '@nestjs/common';
import {
  type ContactSubmittedData,
  type DomainEvent,
  EVENTS,
  type QuotationRequestedData,
  type QuotationStatusChangedData,
} from '@fardeen/types';
import { HandleContactSubmitted } from '../application/handlers/handle-contact-submitted';
import { HandleQuotationRequested } from '../application/handlers/handle-quotation-requested';
import { HandleQuotationStatusChanged } from '../application/handlers/handle-quotation-status-changed';
import { EMAIL_SENDER } from '../application/ports/email-sender.port';
import { NOTIFICATION_REPOSITORY } from '../domain/repositories/notification.repository';
import { APP_CONFIG, type AppConfig, loadConfig } from './config/env';
import { NodemailerEmailSender } from './email/nodemailer.sender';
import { PrismaNotificationRepository } from './prisma/notification.repository.impl';
import { PrismaService } from './prisma/prisma.service';
import { type Dispatch, StreamConsumer } from './redis/stream-consumer';

@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    {
      provide: PrismaService,
      useFactory: (cfg: AppConfig) => new PrismaService(cfg.databaseUrl),
      inject: [APP_CONFIG],
    },
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: EMAIL_SENDER,
      useFactory: (cfg: AppConfig) =>
        new NodemailerEmailSender({
          host: cfg.smtpHost,
          port: cfg.smtpPort,
          user: cfg.smtpUser,
          password: cfg.smtpPassword,
          from: cfg.mailFrom,
        }),
      inject: [APP_CONFIG],
    },
    {
      provide: HandleContactSubmitted,
      useFactory: (email, repo, cfg: AppConfig) => new HandleContactSubmitted(email, repo, cfg.salesInbox),
      inject: [EMAIL_SENDER, NOTIFICATION_REPOSITORY, APP_CONFIG],
    },
    {
      provide: HandleQuotationRequested,
      useFactory: (email, repo, cfg: AppConfig) => new HandleQuotationRequested(email, repo, cfg.salesInbox),
      inject: [EMAIL_SENDER, NOTIFICATION_REPOSITORY, APP_CONFIG],
    },
    {
      provide: HandleQuotationStatusChanged,
      useFactory: (email, repo) => new HandleQuotationStatusChanged(email, repo),
      inject: [EMAIL_SENDER, NOTIFICATION_REPOSITORY],
    },
    {
      // Eagerly instantiated → its onApplicationBootstrap starts the stream consumer loop.
      provide: StreamConsumer,
      useFactory: (
        cfg: AppConfig,
        contact: HandleContactSubmitted,
        quotation: HandleQuotationRequested,
        status: HandleQuotationStatusChanged,
      ) => {
        const dispatch: Dispatch = {
          [EVENTS.contactSubmitted]: (e: DomainEvent) =>
            contact.execute(e as DomainEvent<ContactSubmittedData>),
          [EVENTS.quotationRequested]: (e: DomainEvent) =>
            quotation.execute(e as DomainEvent<QuotationRequestedData>),
          [EVENTS.quotationStatusChanged]: (e: DomainEvent) =>
            status.execute(e as DomainEvent<QuotationStatusChangedData>),
        };
        return new StreamConsumer(
          {
            redisOptions: { host: cfg.redisHost, port: cfg.redisPort, password: cfg.redisPassword },
            group: cfg.group,
            consumerName: cfg.consumerName,
            eventNames: [
              EVENTS.contactSubmitted,
              EVENTS.quotationRequested,
              EVENTS.quotationStatusChanged,
            ],
            maxAttempts: cfg.maxAttempts,
            blockMs: cfg.blockMs,
            batch: cfg.batch,
            reclaimIdleMs: cfg.reclaimIdleMs,
          },
          dispatch,
        );
      },
      inject: [APP_CONFIG, HandleContactSubmitted, HandleQuotationRequested, HandleQuotationStatusChanged],
    },
  ],
})
export class NotificationModule {}
