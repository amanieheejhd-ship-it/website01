import { Injectable } from '@nestjs/common';
import { ServiceOffering } from '../../domain/entities/service-offering.entity';
import type { ServiceRepository } from '../../domain/repositories/service.repository';
import { Money } from '../../domain/value-objects/money.vo';
import { Slug } from '../../domain/value-objects/slug.vo';
import { PrismaService } from './prisma.service';

interface FeatureRow {
  id: string;
  title: string;
  description: string;
  order: number;
}
interface TierRow {
  id: string;
  name: string;
  priceFrom: number;
  currency: string;
  unit: string;
  inclusions: string[];
}
interface OfferingRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  heroMediaId: string | null;
  order: number;
  active: boolean;
  features: FeatureRow[];
  pricingTiers: TierRow[];
}

@Injectable()
export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<ServiceOffering[]> {
    const rows = await this.prisma.serviceOffering.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: { features: { orderBy: { order: 'asc' } }, pricingTiers: true },
    });
    return rows.map((r: OfferingRow) => this.toDomain(r));
  }

  async listAll(): Promise<ServiceOffering[]> {
    const rows = await this.prisma.serviceOffering.findMany({
      orderBy: { order: 'asc' },
      include: { features: { orderBy: { order: 'asc' } }, pricingTiers: true },
    });
    return rows.map((r: OfferingRow) => this.toDomain(r));
  }

  async findBySlug(slug: Slug): Promise<ServiceOffering | null> {
    const r = await this.prisma.serviceOffering.findUnique({
      where: { slug: slug.value },
      include: { features: { orderBy: { order: 'asc' } }, pricingTiers: true },
    });
    return r ? this.toDomain(r as OfferingRow) : null;
  }

  async upsertBySlug(o: ServiceOffering): Promise<void> {
    const features = o.features.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      order: f.order,
    }));
    const tiers = o.pricingTiers.map((p) => ({
      id: p.id,
      name: p.name,
      priceFrom: p.priceFrom.amount,
      currency: p.priceFrom.currency,
      unit: p.unit,
      inclusions: p.inclusions,
    }));
    const base = {
      name: o.name,
      tagline: o.tagline,
      description: o.description,
      icon: o.icon,
      heroMediaId: o.heroMediaId,
      order: o.order,
      active: o.active,
    };
    await this.prisma.serviceOffering.upsert({
      where: { slug: o.slug.value },
      create: {
        id: o.id,
        slug: o.slug.value,
        ...base,
        features: { create: features },
        pricingTiers: { create: tiers },
      },
      update: {
        ...base,
        features: { deleteMany: {}, create: features },
        pricingTiers: { deleteMany: {}, create: tiers },
      },
    });
  }

  private toDomain(r: OfferingRow): ServiceOffering {
    return ServiceOffering.rehydrate({
      id: r.id,
      slug: Slug.create(r.slug),
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      icon: r.icon,
      heroMediaId: r.heroMediaId,
      order: r.order,
      active: r.active,
      features: (r.features ?? []).map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        order: f.order,
      })),
      pricingTiers: (r.pricingTiers ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        priceFrom: Money.of(p.priceFrom, p.currency),
        unit: p.unit,
        inclusions: p.inclusions,
      })),
    });
  }
}
