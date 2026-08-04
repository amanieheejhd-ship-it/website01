import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AdminModule } from './infrastructure/admin.module';

/**
 * Root module. admin-service is the BFF/aggregator (ADR-005): it composes admin read models and
 * forwards commands to the owning services over TCP. It holds no persistent state (only a short
 * Redis cache for the dashboard). The HealthController serves the /health + /ready probes.
 */
@Module({
  imports: [AdminModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
