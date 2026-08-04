import { randomUUID } from 'node:crypto';
import { Page } from '../../domain/entities/page.entity';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { UpdatePage } from './update-page.use-case';

jest.mock('node:crypto', () => ({ randomUUID: jest.fn() }));
const mockedUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

const existingPage = () =>
  Page.create({
    id: 'p1',
    slug: Slug.create('home'),
    title: 'Old title',
    status: 'published',
    seo: { title: 'old', description: 'old', ogImageMediaId: 'm0' },
    sections: [],
  });

const makeRepo = (): jest.Mocked<PageRepository> => ({
  findBySlug: jest.fn(),
  listAll: jest.fn(),
  save: jest.fn(),
});

beforeEach(() => {
  mockedUUID.mockReset();
});

describe('UpdatePage', () => {
  it('replaces editable content, preserves id/slug/status, and assigns ids to new sections', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(existingPage());
    mockedUUID.mockReturnValueOnce('generated-id' as ReturnType<typeof randomUUID>);

    const res = await new UpdatePage(repo).execute({
      slug: 'home',
      title: 'New title',
      seo: { title: 'seo t', description: 'seo d' },
      sections: [
        { id: 'keep', type: 'hero', order: 1, payload: { a: 1 }, mediaRefs: ['x'] },
        { type: 'cta', order: 0, payload: {}, mediaRefs: [] },
      ],
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.id).toBe('p1'); // preserved
      expect(res.data.slug).toBe('home'); // preserved
      expect(res.data.status).toBe('published'); // preserved (publish is separate)
      expect(res.data.title).toBe('New title');
      expect(res.data.seo).toEqual({ title: 'seo t', description: 'seo d', ogImageMediaId: null });
      // sections are returned ordered by `order`
      expect(res.data.sections.map((s) => s.id)).toEqual(['generated-id', 'keep']);
    }

    expect(repo.findBySlug).toHaveBeenCalledWith(expect.any(Slug), true);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0] as Page;
    expect(saved.title).toBe('New title');
    expect(mockedUUID).toHaveBeenCalledTimes(1); // only the id-less section
  });

  it('defaults a missing ogImageMediaId to null', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(existingPage());

    const res = await new UpdatePage(repo).execute({
      slug: 'home',
      title: 'T',
      seo: { title: '', description: '' },
      sections: [],
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.seo.ogImageMediaId).toBeNull();
  });

  it('returns PAGE_NOT_FOUND when the page does not exist', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(null);

    const res = await new UpdatePage(repo).execute({
      slug: 'home',
      title: 'T',
      seo: { title: '', description: '' },
      sections: [],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PAGE_NOT_FOUND');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('maps an invalid slug to a VALIDATION_ERROR Result', async () => {
    const repo = makeRepo();
    const res = await new UpdatePage(repo).execute({
      slug: '!!!',
      title: 'T',
      seo: { title: '', description: '' },
      sections: [],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.findBySlug).not.toHaveBeenCalled();
  });
});
