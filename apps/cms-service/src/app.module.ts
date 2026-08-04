import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ContentModule } from './infrastructure/content.module';

@Module({
  imports: [ContentModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
