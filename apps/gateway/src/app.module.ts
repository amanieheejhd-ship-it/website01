import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SERVICE_CLIENTS } from '@fardeen/types';
import { JwtAuthGuard } from './auth/jwt.guard';
import { RolesGuard } from './auth/roles.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ClientsWarmup } from './common/clients-warmup';
import { CorrelationIdMiddleware } from './common/correlation.middleware';
import { MediaResolver } from './common/media-resolver';
import { ResponseEnvelopeInterceptor } from './common/response.interceptor';
import { GATEWAY_CONFIG, type GatewayConfig, type ServiceLocation, loadGatewayConfig } from './config/env';
import { HealthController } from './health/health.controller';
import { AdminGatewayController } from './presentation/admin.controller';
import { AuthController } from './presentation/auth.controller';
import { ContactGatewayController } from './presentation/contact.controller';
import { ContentGatewayController } from './presentation/content.controller';
import { MediaGatewayController } from './presentation/media.controller';
import { ProjectsController } from './presentation/projects.controller';
import { QuotationsGatewayController } from './presentation/quotations.controller';
import { ServicesController } from './presentation/services.controller';

const tcpClient = (location: ServiceLocation) =>
  ClientProxyFactory.create({ transport: Transport.TCP, options: location });

/**
 * API Gateway root module (docs/ARCHITECTURE.md §2, ADR-004). The ONLY public door: RS256 local
 * verification, RBAC, rate limiting, correlation-id, a ClientProxy per bounded context, media
 * composition, and a global error/response envelope — reused for every service.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
      },
    ]),
  ],
  controllers: [
    AuthController,
    ServicesController,
    ProjectsController,
    ContentGatewayController,
    ContactGatewayController,
    QuotationsGatewayController,
    MediaGatewayController,
    AdminGatewayController,
    HealthController,
  ],
  providers: [
    { provide: GATEWAY_CONFIG, useFactory: loadGatewayConfig },
    { provide: SERVICE_CLIENTS.auth, useFactory: (c: GatewayConfig) => tcpClient(c.services.auth), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.cms, useFactory: (c: GatewayConfig) => tcpClient(c.services.cms), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.project, useFactory: (c: GatewayConfig) => tcpClient(c.services.project), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.service, useFactory: (c: GatewayConfig) => tcpClient(c.services.service), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.contact, useFactory: (c: GatewayConfig) => tcpClient(c.services.contact), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.quotation, useFactory: (c: GatewayConfig) => tcpClient(c.services.quotation), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.media, useFactory: (c: GatewayConfig) => tcpClient(c.services.media), inject: [GATEWAY_CONFIG] },
    { provide: SERVICE_CLIENTS.admin, useFactory: (c: GatewayConfig) => tcpClient(c.services.admin), inject: [GATEWAY_CONFIG] },
    MediaResolver,
    ClientsWarmup,
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
