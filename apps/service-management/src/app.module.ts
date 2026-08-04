import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CatalogModule } from './infrastructure/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
