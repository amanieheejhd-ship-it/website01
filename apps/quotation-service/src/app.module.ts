import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { QuotationModule } from './infrastructure/quotation.module';

@Module({
  imports: [QuotationModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
