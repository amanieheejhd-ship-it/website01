import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MediaModule } from './infrastructure/media.module';

@Module({
  imports: [MediaModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
