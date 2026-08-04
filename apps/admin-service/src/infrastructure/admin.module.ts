import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { SERVICE_CLIENTS } from '@fardeen/types';
import { Redis } from 'ioredis';
import { GetDashboard } from '../application/get-dashboard.use-case';
import { DASHBOARD_CACHE } from '../application/ports/dashboard-cache.port';
import { DOWNSTREAM } from '../application/ports/downstream.port';
import { AdminController } from '../presentation/admin.controller';
import { AdminClientsWarmup } from './clients-warmup';
import { APP_CONFIG, type AppConfig, loadConfig, type ServiceLocation } from './config/env';
import { RedisDashboardCache } from './redis-dashboard-cache';
import { REDIS_CLIENT } from './redis/redis.tokens';
import { TcpDownstream } from './tcp-downstream';

const tcpClient = (loc: ServiceLocation) =>
  ClientProxyFactory.create({ transport: Transport.TCP, options: loc });

/**
 * admin-service composition root (ADR-005). One ClientProxy per owning service, a Redis client for
 * the dashboard cache, and the orchestration use-cases. No PrismaService — this BFF owns no DB.
 */
@Module({
  controllers: [AdminController],
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfig },
    { provide: SERVICE_CLIENTS.project, useFactory: (c: AppConfig) => tcpClient(c.services.project), inject: [APP_CONFIG] },
    { provide: SERVICE_CLIENTS.service, useFactory: (c: AppConfig) => tcpClient(c.services.service), inject: [APP_CONFIG] },
    { provide: SERVICE_CLIENTS.cms, useFactory: (c: AppConfig) => tcpClient(c.services.cms), inject: [APP_CONFIG] },
    { provide: SERVICE_CLIENTS.contact, useFactory: (c: AppConfig) => tcpClient(c.services.contact), inject: [APP_CONFIG] },
    { provide: SERVICE_CLIENTS.quotation, useFactory: (c: AppConfig) => tcpClient(c.services.quotation), inject: [APP_CONFIG] },
    { provide: SERVICE_CLIENTS.media, useFactory: (c: AppConfig) => tcpClient(c.services.media), inject: [APP_CONFIG] },
    {
      provide: REDIS_CLIENT,
      useFactory: (c: AppConfig) =>
        new Redis({
          host: c.redisHost,
          port: c.redisPort,
          password: c.redisPassword,
          maxRetriesPerRequest: null,
        }),
      inject: [APP_CONFIG],
    },
    { provide: DOWNSTREAM, useClass: TcpDownstream },
    { provide: DASHBOARD_CACHE, useClass: RedisDashboardCache },
    {
      provide: GetDashboard,
      useFactory: (d, cache, c: AppConfig) => new GetDashboard(d, cache, c.dashboardCacheTtl),
      inject: [DOWNSTREAM, DASHBOARD_CACHE, APP_CONFIG],
    },
    AdminClientsWarmup,
  ],
})
export class AdminModule {}
