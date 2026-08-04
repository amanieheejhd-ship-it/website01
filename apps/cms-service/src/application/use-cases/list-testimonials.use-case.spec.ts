import { Testimonial } from '../../domain/entities/testimonial.entity';
import type { TestimonialRepository } from '../../domain/repositories/cms.repository';
import { ListTestimonials } from './list-testimonials.use-case';

const testimonial = (id: string, featured: boolean) =>
  Testimonial.rehydrate({
    id,
    author: 'A',
    role: 'R',
    company: 'C',
    quote: 'Q',
    rating: 4,
    avatarMediaId: null,
    featured,
  });

const makeRepo = (): jest.Mocked<TestimonialRepository> => ({ list: jest.fn() });

describe('ListTestimonials', () => {
  it('maps testimonials to DTOs and forwards the featured filter', async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([testimonial('t1', true)]);

    const res = await new ListTestimonials(repo).execute({ featured: true });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual([
        {
          id: 't1',
          author: 'A',
          role: 'R',
          company: 'C',
          quote: 'Q',
          rating: 4,
          avatarMediaId: null,
          featured: true,
        },
      ]);
    }
    expect(repo.list).toHaveBeenCalledWith(true);
  });

  it('passes an undefined filter through (no featured query)', async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([]);

    const res = await new ListTestimonials(repo).execute({});

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
    expect(repo.list).toHaveBeenCalledWith(undefined);
  });
});
