import { type AdminPageListItem, ok, type Result } from '@fardeen/types';
import type { PageRepository } from '../../domain/repositories/cms.repository';

/** Admin: every page (incl drafts) as summaries (no sections). */
export class ListPages {
  constructor(private readonly pages: PageRepository) {}

  async execute(): Promise<Result<AdminPageListItem[]>> {
    const pages = await this.pages.listAll();
    return ok(
      pages.map((p) => ({ id: p.id, slug: p.slug.value, title: p.title, status: p.status })),
    );
  }
}
