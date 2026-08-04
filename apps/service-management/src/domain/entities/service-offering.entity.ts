import { Money } from '../value-objects/money.vo';
import { Slug } from '../value-objects/slug.vo';

export interface Feature {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface PricingTier {
  id: string;
  name: string;
  priceFrom: Money;
  unit: string;
  inclusions: string[];
}

export interface ServiceOfferingProps {
  id: string;
  slug: Slug;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  heroMediaId: string | null;
  order: number;
  active: boolean;
  features: Feature[];
  pricingTiers: PricingTier[];
}

/** ServiceOffering aggregate root (docs/DOMAIN-MODEL.md §Service Catalog). Invariant: slug unique
 *  (enforced by the repository upsert-by-slug). */
export class ServiceOffering {
  private constructor(private readonly props: ServiceOfferingProps) {}

  static create(props: ServiceOfferingProps): ServiceOffering {
    return new ServiceOffering(props);
  }
  static rehydrate(props: ServiceOfferingProps): ServiceOffering {
    return new ServiceOffering(props);
  }

  get id(): string {
    return this.props.id;
  }
  get slug(): Slug {
    return this.props.slug;
  }
  get name(): string {
    return this.props.name;
  }
  get tagline(): string {
    return this.props.tagline;
  }
  get description(): string {
    return this.props.description;
  }
  get icon(): string {
    return this.props.icon;
  }
  get heroMediaId(): string | null {
    return this.props.heroMediaId;
  }
  get order(): number {
    return this.props.order;
  }
  get active(): boolean {
    return this.props.active;
  }
  get features(): Feature[] {
    return this.props.features;
  }
  get pricingTiers(): PricingTier[] {
    return this.props.pricingTiers;
  }
}
