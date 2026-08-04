import { ok, type Result, type ServiceOfferingDto } from '@fardeen/types';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { toServiceOfferingDto } from '../mappers/service.mapper';

export class ListServices {
  constructor(private readonly repo: ServiceRepository) {}

  async execute(): Promise<Result<ServiceOfferingDto[]>> {
    const items = await this.repo.listActive();
    return ok(items.map(toServiceOfferingDto));
  }
}
