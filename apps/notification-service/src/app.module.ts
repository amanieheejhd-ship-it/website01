import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { NotificationModule } from './infrastructure/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
