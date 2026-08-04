import type { PageDto, TestimonialDto } from '@fardeen/types';
import type { Page } from '../../domain/entities/page.entity';
import type { Testimonial } from '../../domain/entities/testimonial.entity';

export function toPageDto(page: Page): PageDto {
  return {
    id: page.id,
    slug: page.slug.value,
    title: page.title,
    status: page.status,
    seo: {
      title: page.seo.title,
      description: page.seo.description,
      ogImageMediaId: page.seo.ogImageMediaId,
    },
    sections: page.sections.map((s) => ({
      id: s.id,
      type: s.type,
      order: s.order,
      payload: s.payload,
      mediaRefs: s.mediaRefs,
    })),
  };
}

export function toTestimonialDto(t: Testimonial): TestimonialDto {
  return {
    id: t.id,
    author: t.author,
    role: t.role,
    company: t.company,
    quote: t.quote,
    rating: t.rating,
    avatarMediaId: t.avatarMediaId,
    featured: t.featured,
  };
}
