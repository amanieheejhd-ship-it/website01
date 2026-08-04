import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MEDIA_PATTERNS, type ResolveManyResult, SERVICE_CLIENTS } from '@fardeen/types';
import { callService } from './client.util';

/**
 * Gateway-side media composition. Batch-resolves reference ids → presigned urls/variants via
 * media-service. Resolution happens ONLY here (docs/ARCHITECTURE.md §7). Degrades gracefully:
 * if media-service is unavailable, content reads still succeed (empty resolution map).
 */
@Injectable()
export class MediaResolver {
  constructor(@Inject(SERVICE_CLIENTS.media) private readonly client: ClientProxy) {}

  async resolveMany(ids: Array<string | null | undefined>): Promise<ResolveManyResult> {
    const unique = Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
    if (unique.length === 0) return {};
    try {
      return await callService<ResolveManyResult>(this.client, MEDIA_PATTERNS.resolveMany, {
        ids: unique,
      });
    } catch {
      return {};
    }
  }
}
