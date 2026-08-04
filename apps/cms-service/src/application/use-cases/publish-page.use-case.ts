import { EVENTS, err, ok, type PageDto, type PublishPagePayload, type Result } from '@fardeen/types';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { EventPublisher } from '../ports/event-publisher.port';
import { toPageDto } from '../mappers/cms.mapper';
import { toErr } from '../result.util';

/** Admin: publish a page → emits cms.published (gateway cache-invalidation consumer arrives in 4c). */
export class PublishPage {
  constructor(
    private readonly pages: PageRepository,
    private readonly events: EventPublisher,
  ) {}

  async execute(payload: PublishPagePayload): Promise<Result<PageDto>> {
    try {
      const page = await this.pages.findBySlug(Slug.create(payload.slug), true);
      if (!page) {
        return err({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
      }
      page.publish();
      await this.pages.save(page);
      await this.events.publish({
        name: EVENTS.cmsPublished,
        correlationId: payload.correlationId,
        data: { pageId: page.id, slug: page.slug.value },
      });
      return ok(toPageDto(page));
    } catch (e) {
      return toErr(e);
    }
  }
}
