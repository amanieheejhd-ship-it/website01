import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(databaseUrl: string) {
    super({ datasources: { db: { url: databaseUrl } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
