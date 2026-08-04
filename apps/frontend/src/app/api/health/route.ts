import { NextResponse } from 'next/server';

// Liveness probe for the Docker healthcheck (Phase 3 infra only).
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({
    data: { status: 'ok', service: 'frontend', uptimeSeconds: Math.round(process.uptime()) },
    meta: { requestId: crypto.randomUUID() },
  });
}
