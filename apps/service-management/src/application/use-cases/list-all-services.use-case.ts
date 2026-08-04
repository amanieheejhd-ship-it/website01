import { ok, type Result, type ServiceOfferingDto } from '@fardeen/types';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { toServiceOfferingDto } from '../mappers/service.mapper';

/** Admin: every offering incl inactive (the public list is active-only). */
export class ListAllServices {
  constructor(private readonly repo: ServiceRepository) {}

  async execute(): Promise<Result<ServiceOfferingDto[]>> {
    const items = await this.repo.listAll();
    return ok(items.map(toServiceOfferingDto));
  }
}
