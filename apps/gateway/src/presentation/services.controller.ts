import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENTS, SERVICE_PATTERNS, type ServiceOfferingDto } from '@fardeen/types';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { MediaResolver } from '../common/media-resolver';

/** Public service catalog. Media refs (heroMediaId) resolved at the gateway. */
@Controller('services')
export class ServicesController {
  constructor(
    @Inject(SERVICE_CLIENTS.service) private readonly client: ClientProxy,
    private readonly media: MediaResolver,
  ) {}

  @Get()
  async list(@Req() req: FardeenRequest): Promise<unknown> {
    const items = await callService<ServiceOfferingDto[]>(this.client, SERVICE_PATTERNS.list, {});
    const media = await this.media.resolveMany(items.map((o) => o.heroMediaId));
    return { data: items, included: { media }, meta: { requestId: req.requestId ?? 'unknown' } };
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string, @Req() req: FardeenRequest): Promise<unknown> {
    const offering = await callService<ServiceOfferingDto>(this.client, SERVICE_PATTERNS.getBySlug, {
      slug,
    });
    const media = await this.media.resolveMany([offering.heroMediaId]);
    return { data: offering, included: { media }, meta: { requestId: req.requestId ?? 'unknown' } };
  }
}
