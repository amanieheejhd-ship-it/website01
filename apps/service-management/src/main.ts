import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

/**
 * Hybrid bootstrap: a tiny HTTP server (for /health + /ready probes) alongside the TCP
 * microservice transport the gateway talks to. Phase 3 wiring only — @MessagePattern
 * handlers arrive in Phase 4.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.SERVICE_BIND_HOST ?? '0.0.0.0',
      port: Number(process.env.TCP_PORT ?? 4001),
    },
  });

  await app.startAllMicroservices();

  const httpPort = Number(process.env.HTTP_PORT ?? 3001);
  await app.listen(httpPort, '0.0.0.0');

  const name = process.env.SERVICE_NAME ?? 'service';
  console.log(`[${name}] health http :${httpPort} · tcp transport :${process.env.TCP_PORT ?? 4001}`);
}

void bootstrap();
