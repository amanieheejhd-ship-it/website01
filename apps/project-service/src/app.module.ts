import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PortfolioModule } from './infrastructure/portfolio.module';

@Module({
  imports: [PortfolioModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
