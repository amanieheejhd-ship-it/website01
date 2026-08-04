import { EVENTS } from '@fardeen/types';
import { Page } from '../../domain/entities/page.entity';
import type { PageRepository } from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { EVENT_PUBLISHER, type EventPublisher } from '../ports/event-publisher.port';
import { PublishPage } from './publish-page.use-case';

describe('event-publisher port token', () => {
  it('exposes the EVENT_PUBLISHER injection token as a symbol', () => {
    expect(typeof EVENT_PUBLISHER).toBe('symbol');
  });
});

const makePage = (status: 'draft' | 'published') =>
  Page.create({
    id: 'p1',
    slug: Slug.create('home'),
    title: 'Home',
    status,
    seo: { title: 'Home', description: 'd', ogImageMediaId: null },
    sections: [],
  });

const makeRepo = (): jest.Mocked<PageRepository> => ({
  findBySlug: jest.fn(),
  listAll: jest.fn(),
  save: jest.fn(),
});
const makeEvents = (): jest.Mocked<EventPublisher> => ({ publish: jest.fn() });

describe('PublishPage', () => {
  it('publishes the page, saves it, and emits cms.published', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    const page = makePage('draft');
    repo.findBySlug.mockResolvedValue(page);

    const res = await new PublishPage(repo, events).execute({
      slug: 'home',
      correlationId: 'corr-1',
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe('published');

    // looked up including unpublished
    expect(repo.findBySlug).toHaveBeenCalledWith(expect.any(Slug), true);
    // saved the now-published aggregate
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0] as Page;
    expect(saved.isPublished()).toBe(true);
    // saved before the event fired
    expect(repo.save.mock.invocationCallOrder[0]).toBeLessThan(
      events.publish.mock.invocationCallOrder[0],
    );
    // emitted event pattern
    expect(events.publish).toHaveBeenCalledWith({
      name: EVENTS.cmsPublished,
      correlationId: 'corr-1',
      data: { pageId: 'p1', slug: 'home' },
    });
    expect(EVENTS.cmsPublished).toBe('cms.published');
  });

  it('returns PAGE_NOT_FOUND and emits nothing when the page is missing', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findBySlug.mockResolvedValue(null);

    const res = await new PublishPage(repo, events).execute({ slug: 'home' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PAGE_NOT_FOUND');
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('maps an invalid slug to a VALIDATION_ERROR Result', async () => {
    const repo = makeRepo();
    const events = makeEvents();

    const res = await new PublishPage(repo, events).execute({ slug: '!!!' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(repo.findBySlug).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('rethrows an unexpected error from save', async () => {
    const repo = makeRepo();
    const events = makeEvents();
    repo.findBySlug.mockResolvedValue(makePage('draft'));
    repo.save.mockRejectedValue(new Error('write failed'));

    await expect(
      new PublishPage(repo, events).execute({ slug: 'home' }),
    ).rejects.toThrow('write failed');
  });
});
