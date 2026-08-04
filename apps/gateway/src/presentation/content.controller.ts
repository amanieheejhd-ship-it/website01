import { BadRequestException, Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CMS_PATTERNS,
  listTestimonialsQuerySchema,
  type PageDto,
  SERVICE_CLIENTS,
  type TestimonialDto,
} from '@fardeen/types';
import { callService } from '../common/client.util';
import type { FardeenRequest } from '../common/http';
import { MediaResolver } from '../common/media-resolver';

/** Public CMS content. Published pages only; section mediaRefs + og image resolved at the gateway. */
@Controller()
export class ContentGatewayController {
  constructor(
    @Inject(SERVICE_CLIENTS.cms) private readonly client: ClientProxy,
    private readonly media: MediaResolver,
  ) {}

  @Get('pages/:slug')
  async page(@Param('slug') slug: string, @Req() req: FardeenRequest): Promise<unknown> {
    const page = await callService<PageDto>(this.client, CMS_PATTERNS.getPage, {
      slug,
      includeUnpublished: false,
    });
    const ids = [page.seo.ogImageMediaId, ...page.sections.flatMap((s) => s.mediaRefs)];
    const media = await this.media.resolveMany(ids);
    return { data: page, included: { media }, meta: { requestId: req.requestId ?? 'unknown' } };
  }

  @Get('testimonials')
  testimonials(@Query() query: unknown): Promise<TestimonialDto[]> {
    const parsed = listTestimonialsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
      });
    }
    return callService<TestimonialDto[]>(this.client, CMS_PATTERNS.listTestimonials, parsed.data);
  }
}
