import { randomUUID } from 'node:crypto';
import { ok, type Result, type ServiceOfferingDto, type UpsertServicePayload } from '@fardeen/types';
import { ServiceOffering } from '../../domain/entities/service-offering.entity';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { Money } from '../../domain/value-objects/money.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { toServiceOfferingDto } from '../mappers/service.mapper';
import { toErr } from '../result.util';

/** Admin upsert (gateway exposes it in Phase 7; used now by the seed + tests). */
export class UpsertService {
  constructor(private readonly repo: ServiceRepository) {}

  async execute(payload: UpsertServicePayload): Promise<Result<ServiceOfferingDto>> {
    try {
      const offering = ServiceOffering.create({
        id: randomUUID(),
        slug: Slug.create(payload.slug),
        name: payload.name,
        tagline: payload.tagline,
        description: payload.description,
        icon: payload.icon,
        heroMediaId: payload.heroMediaId ?? null,
        order: payload.order,
        active: payload.active,
        features: payload.features.map((f) => ({
          id: randomUUID(),
          title: f.title,
          description: f.description,
          order: f.order,
        })),
        pricingTiers: payload.pricingTiers.map((p) => ({
          id: randomUUID(),
          name: p.name,
          priceFrom: Money.of(p.priceFrom, p.currency),
          unit: p.unit,
          inclusions: p.inclusions,
        })),
      });
      await this.repo.upsertBySlug(offering);
      return ok(toServiceOfferingDto(offering));
    } catch (e) {
      return toErr(e);
    }
  }
}
