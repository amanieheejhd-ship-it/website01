import { err, type GetPagePayload, ok, type PageDto, type Result } from '@fardeen/types';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { toPageDto } from '../mappers/cms.mapper';
import { toErr } from '../result.util';

export class GetPage {
  constructor(private readonly pages: PageRepository) {}

  async execute(payload: GetPagePayload): Promise<Result<PageDto>> {
    try {
      const page = await this.pages.findBySlug(
        Slug.create(payload.slug),
        payload.includeUnpublished ?? false,
      );
      if (!page) {
        return err({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
      }
      return ok(toPageDto(page));
    } catch (e) {
      return toErr(e);
    }
  }
}
