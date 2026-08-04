import { err, ok, type GetServiceBySlugPayload, type Result, type ServiceOfferingDto } from '@fardeen/types';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { toServiceOfferingDto } from '../mappers/service.mapper';
import { toErr } from '../result.util';

export class GetServiceBySlug {
  constructor(private readonly repo: ServiceRepository) {}

  async execute(payload: GetServiceBySlugPayload): Promise<Result<ServiceOfferingDto>> {
    try {
      const offering = await this.repo.findBySlug(Slug.create(payload.slug));
      if (!offering) {
        return err({ code: 'SERVICE_NOT_FOUND', message: 'Service offering not found' });
      }
      return ok(toServiceOfferingDto(offering));
    } catch (e) {
      return toErr(e);
    }
  }
}
