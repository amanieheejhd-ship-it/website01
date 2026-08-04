import { type ListTestimonialsPayload, ok, type Result, type TestimonialDto } from '@fardeen/types';
import type { TestimonialRepository } from '../../domain/repositories/cms.repository';
import { toTestimonialDto } from '../mappers/cms.mapper';

export class ListTestimonials {
  constructor(private readonly repo: TestimonialRepository) {}

  async execute(payload: ListTestimonialsPayload): Promise<Result<TestimonialDto[]>> {
    const items = await this.repo.list(payload.featured);
    return ok(items.map(toTestimonialDto));
  }
}
