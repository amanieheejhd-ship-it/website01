import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './infrastructure/auth.module';

/**
 * Root module for the auth-service. Registers the auth vertical (Clean-Architecture layers wired in
 * AuthModule) alongside the infra HealthController.
 */
@Module({
  imports: [AuthModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
