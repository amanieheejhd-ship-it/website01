import { randomUUID } from 'node:crypto';
import { err, ok, type PageDto, type Result, type UpdatePagePayload } from '@fardeen/types';
import { Page } from '../../domain/entities/page.entity';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { toPageDto } from '../mappers/cms.mapper';
import { toErr } from '../result.util';

/**
 * Admin: replace a page's editable content (title, seo, ordered sections). Publish is a separate
 * action, so status is preserved. Sections without an id get a fresh one.
 */
export class UpdatePage {
  constructor(private readonly pages: PageRepository) {}

  async execute(payload: UpdatePagePayload): Promise<Result<PageDto>> {
    try {
      const existing = await this.pages.findBySlug(Slug.create(payload.slug), true);
      if (!existing) {
        return err({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
      }
      const updated = Page.create({
        id: existing.id,
        slug: existing.slug,
        title: payload.title,
        status: existing.status,
        seo: {
          title: payload.seo.title,
          description: payload.seo.description,
          ogImageMediaId: payload.seo.ogImageMediaId ?? null,
        },
        sections: payload.sections.map((s) => ({
          id: s.id ?? randomUUID(),
          type: s.type,
          order: s.order,
          payload: s.payload,
          mediaRefs: s.mediaRefs,
        })),
      });
      await this.pages.save(updated);
      return ok(toPageDto(updated));
    } catch (e) {
      return toErr(e);
    }
  }
}
