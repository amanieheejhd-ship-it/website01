import { Testimonial, type TestimonialProps } from './testimonial.entity';

const props: TestimonialProps = {
  id: 't1',
  author: 'Ada',
  role: 'CTO',
  company: 'Acme',
  quote: 'Great work',
  rating: 5,
  avatarMediaId: null,
  featured: true,
};

describe('Testimonial entity', () => {
  it('rehydrates and exposes every prop via getters', () => {
    const t = Testimonial.rehydrate(props);
    expect(t.id).toBe('t1');
    expect(t.author).toBe('Ada');
    expect(t.role).toBe('CTO');
    expect(t.company).toBe('Acme');
    expect(t.quote).toBe('Great work');
    expect(t.rating).toBe(5);
    expect(t.avatarMediaId).toBeNull();
    expect(t.featured).toBe(true);
  });

  it('preserves a set avatarMediaId', () => {
    const t = Testimonial.rehydrate({ ...props, avatarMediaId: 'media-9', featured: false });
    expect(t.avatarMediaId).toBe('media-9');
    expect(t.featured).toBe(false);
  });
});
