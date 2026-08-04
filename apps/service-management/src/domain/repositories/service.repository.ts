import type { ServiceOffering } from '../entities/service-offering.entity';
import type { Slug } from '../value-objects/slug.vo';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export interface ServiceRepository {
  /** Active offerings ordered by `order` (catalog display sequence). */
  listActive(): Promise<ServiceOffering[]>;
  /** All offerings incl inactive, ordered by `order` (admin). */
  listAll(): Promise<ServiceOffering[]>;
  findBySlug(slug: Slug): Promise<ServiceOffering | null>;
  upsertBySlug(offering: ServiceOffering): Promise<void>;
}
