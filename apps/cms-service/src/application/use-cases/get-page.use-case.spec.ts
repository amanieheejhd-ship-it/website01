import { Page } from '../../domain/entities/page.entity';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { GetPage } from './get-page.use-case';

const makePage = (status: 'draft' | 'published') =>
  Page.create({
    id: 'p1',
    slug: Slug.create('home'),
    title: 'Home',
    status,
    seo: { title: 'Home', description: 'd', ogImageMediaId: null },
    sections: [{ id: 's1', type: 'hero', order: 0, payload: {}, mediaRefs: [] }],
  });

const makeRepo = (): jest.Mocked<PageRepository> => ({
  findBySlug: jest.fn(),
  listAll: jest.fn(),
  save: jest.fn(),
});

describe('GetPage', () => {
  it('returns a published page mapped to a DTO', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(makePage('published'));
    const res = await new GetPage(repo).execute({ slug: 'Home' });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slug).toBe('home');
      expect(res.data.status).toBe('published');
    }
    // published-only by default
    expect(repo.findBySlug).toHaveBeenCalledWith(expect.any(Slug), false);
    expect((repo.findBySlug.mock.calls[0][0] as Slug).value).toBe('home');
  });

  it('hides a draft by default (findBySlug returns null → PAGE_NOT_FOUND)', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(null);
    const res = await new GetPage(repo).execute({ slug: 'home' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PAGE_NOT_FOUND');
    expect(repo.findBySlug).toHaveBeenCalledWith(expect.any(Slug), false);
  });

  it('passes includeUnpublished=true through to the repository', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(makePage('draft'));
    const res = await new GetPage(repo).execute({ slug: 'home', includeUnpublished: true });

    expect(res.ok).toBe(true);
    expect(repo.findBySlug).toHaveBeenCalledWith(expect.any(Slug), true);
  });

  it('maps a thrown ValidationError (invalid slug) to a Result error', async () => {
    const repo = makeRepo();
    const res = await new GetPage(repo).execute({ slug: '!!!' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.findBySlug).not.toHaveBeenCalled();
  });

  it('rethrows an unexpected (non-domain) error', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockRejectedValue(new Error('db down'));
    await expect(new GetPage(repo).execute({ slug: 'home' })).rejects.toThrow('db down');
  });
});
