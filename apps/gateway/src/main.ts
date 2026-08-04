import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GATEWAY_CONFIG, type GatewayConfig } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const cfg = app.get<GatewayConfig>(GATEWAY_CONFIG);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: cfg.corsOrigins, credentials: true });
  app.setGlobalPrefix(cfg.globalPrefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  await app.listen(cfg.port);
  // eslint-disable-next-line no-console
  console.log(`[gateway] REST surface on :${cfg.port}/${cfg.globalPrefix}`);
}

void bootstrap();
