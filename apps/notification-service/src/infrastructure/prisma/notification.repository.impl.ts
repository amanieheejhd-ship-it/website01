import { Injectable } from '@nestjs/common';
import type { Notification, NotificationStatus } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type { Prisma } from '../../../generated/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(n: Notification): Promise<void> {
    await this.prisma.notification.create({
      data: {
        id: n.id,
        channel: n.channel,
        template: n.template,
        to: n.to,
        payload: n.payload as Prisma.InputJsonValue,
        status: n.status,
        attempts: n.attempts,
        correlationId: n.correlationId,
        createdAt: n.createdAt,
      },
    });
  }

  countByStatus(status: NotificationStatus): Promise<number> {
    return this.prisma.notification.count({ where: { status } });
  }

  async isProcessed(correlationId: string): Promise<boolean> {
    return (await this.prisma.processedEvent.count({ where: { correlationId } })) > 0;
  }

  async markProcessed(correlationId: string): Promise<void> {
    await this.prisma.processedEvent.upsert({
      where: { correlationId },
      update: {},
      create: { correlationId },
    });
  }
}
