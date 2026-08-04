import type { ServiceOfferingDto } from '@fardeen/types';
import type { ServiceOffering } from '../../domain/entities/service-offering.entity';

export function toServiceOfferingDto(o: ServiceOffering): ServiceOfferingDto {
  return {
    id: o.id,
    slug: o.slug.value,
    name: o.name,
    tagline: o.tagline,
    description: o.description,
    icon: o.icon,
    heroMediaId: o.heroMediaId,
    order: o.order,
    active: o.active,
    features: o.features.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      order: f.order,
    })),
    pricingTiers: o.pricingTiers.map((p) => ({
      id: p.id,
      name: p.name,
      priceFrom: p.priceFrom.amount,
      currency: p.priceFrom.currency,
      unit: p.unit,
      inclusions: p.inclusions,
    })),
  };
}
