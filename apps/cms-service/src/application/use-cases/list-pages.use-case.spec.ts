import { Page } from '../../domain/entities/page.entity';
import {
  PAGE_REPOSITORY,
  type PageRepository,
  TESTIMONIAL_REPOSITORY,
} from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { ListPages } from './list-pages.use-case';

describe('cms.repository DI tokens', () => {
  it('exposes repository injection tokens as unique symbols', () => {
    expect(typeof PAGE_REPOSITORY).toBe('symbol');
    expect(typeof TESTIMONIAL_REPOSITORY).toBe('symbol');
    expect(PAGE_REPOSITORY).not.toBe(TESTIMONIAL_REPOSITORY);
  });
});

const page = (id: string, slug: string, status: 'draft' | 'published') =>
  Page.create({
    id,
    slug: Slug.create(slug),
    title: `Title ${id}`,
    status,
    seo: { title: '', description: '', ogImageMediaId: null },
    sections: [],
  });

const makeRepo = (): jest.Mocked<PageRepository> => ({
  findBySlug: jest.fn(),
  listAll: jest.fn(),
  save: jest.fn(),
});

describe('ListPages', () => {
  it('maps every page (incl drafts) to summary items without sections', async () => {
    const repo = makeRepo();
    repo.listAll.mockResolvedValue([page('1', 'home', 'published'), page('2', 'about', 'draft')]);

    const res = await new ListPages(repo).execute();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual([
        { id: '1', slug: 'home', title: 'Title 1', status: 'published' },
        { id: '2', slug: 'about', title: 'Title 2', status: 'draft' },
      ]);
    }
    expect(repo.listAll).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when there are no pages', async () => {
    const repo = makeRepo();
    repo.listAll.mockResolvedValue([]);

    const res = await new ListPages(repo).execute();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });
});
