import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { connect } from 'node:net';

/**
 * Thin liveness (/health) + readiness (/ready) endpoints — Phase 3 infra only, no business
 * logic. /ready TCP-probes the dependencies this container is configured to need
 * (READY_CHECK_* env flags), returning 503 until they are reachable so Docker health checks
 * and `depends_on: service_healthy` gate boot order correctly (docs/ARCHITECTURE.md §9).
 */
const SERVICE_NAME = process.env.SERVICE_NAME ?? 'fardeen-service';

const isEnabled = (v: string | undefined): boolean => v === 'true' || v === '1';

function tcpProbe(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const finish = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  @Get('health')
  liveness(): unknown {
    return {
      data: {
        status: 'ok',
        service: SERVICE_NAME,
        uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      },
      meta: { requestId: randomUUID() },
    };
  }

  @Get('ready')
  async readiness(): Promise<unknown> {
    const checks: Record<string, 'up' | 'down'> = {};

    if (isEnabled(process.env.READY_CHECK_POSTGRES)) {
      checks.postgres = (await tcpProbe(
        process.env.POSTGRES_HOST ?? 'localhost',
        Number(process.env.POSTGRES_PORT ?? 5432),
      ))
        ? 'up'
        : 'down';
    }
    if (isEnabled(process.env.READY_CHECK_REDIS)) {
      checks.redis = (await tcpProbe(
        process.env.REDIS_HOST ?? 'localhost',
        Number(process.env.REDIS_PORT ?? 6379),
      ))
        ? 'up'
        : 'down';
    }
    if (isEnabled(process.env.READY_CHECK_MINIO)) {
      checks.minio = (await tcpProbe(
        process.env.MINIO_ENDPOINT ?? 'localhost',
        Number(process.env.MINIO_PORT ?? 9000),
      ))
        ? 'up'
        : 'down';
    }

    const allUp = Object.values(checks).every((s) => s === 'up');
    const body = {
      data: { status: allUp ? 'ready' : 'not-ready', service: SERVICE_NAME, checks },
      meta: { requestId: randomUUID() },
    };
    if (!allUp) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
