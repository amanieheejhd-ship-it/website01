import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ContactModule } from './infrastructure/contact.module';

@Module({
  imports: [ContactModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
