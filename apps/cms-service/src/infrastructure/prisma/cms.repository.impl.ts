import { Injectable } from '@nestjs/common';
import type { PageStatus, SectionType } from '@fardeen/types';
import { Page } from '../../domain/entities/page.entity';
import { Testimonial } from '../../domain/entities/testimonial.entity';
import type {
  PageRepository,
  TestimonialRepository,
} from '../../domain/repositories/cms.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type { Prisma } from '../../../generated/client';
import { PrismaService } from './prisma.service';

interface SectionRow {
  id: string;
  type: string;
  order: number;
  payload: unknown;
  mediaRefs: string[];
}
interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  seoOgImageMediaId: string | null;
  sections: SectionRow[];
}
interface TestimonialRow {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatarMediaId: string | null;
  featured: boolean;
}

@Injectable()
export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: Slug, includeUnpublished: boolean): Promise<Page | null> {
    const r = await this.prisma.page.findUnique({
      where: { slug: slug.value },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!r) return null;
    if (!includeUnpublished && r.status !== 'published') return null;
    return this.toDomain(r as PageRow);
  }

  async listAll(): Promise<Page[]> {
    const rows = await this.prisma.page.findMany({
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { slug: 'asc' },
    });
    return rows.map((r) => this.toDomain(r as PageRow));
  }

  async save(page: Page): Promise<void> {
    const sections = page.sections.map((s) => ({
      id: s.id,
      type: s.type,
      order: s.order,
      payload: s.payload as Prisma.InputJsonValue,
      mediaRefs: s.mediaRefs,
    }));
    const base = {
      slug: page.slug.value,
      title: page.title,
      status: page.status,
      seoTitle: page.seo.title,
      seoDescription: page.seo.description,
      seoOgImageMediaId: page.seo.ogImageMediaId,
    };
    await this.prisma.page.upsert({
      where: { id: page.id },
      create: { id: page.id, ...base, sections: { create: sections } },
      update: { ...base, sections: { deleteMany: {}, create: sections } },
    });
  }

  private toDomain(r: PageRow): Page {
    return Page.rehydrate({
      id: r.id,
      slug: Slug.create(r.slug),
      title: r.title,
      status: r.status as PageStatus,
      seo: {
        title: r.seoTitle,
        description: r.seoDescription,
        ogImageMediaId: r.seoOgImageMediaId,
      },
      sections: (r.sections ?? []).map((s) => ({
        id: s.id,
        type: s.type as SectionType,
        order: s.order,
        payload: s.payload,
        mediaRefs: s.mediaRefs,
      })),
    });
  }
}

@Injectable()
export class PrismaTestimonialRepository implements TestimonialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(featured?: boolean): Promise<Testimonial[]> {
    const rows = await this.prisma.testimonial.findMany({
      where: featured !== undefined ? { featured } : {},
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: TestimonialRow) =>
      Testimonial.rehydrate({
        id: r.id,
        author: r.author,
        role: r.role,
        company: r.company,
        quote: r.quote,
        rating: r.rating,
        avatarMediaId: r.avatarMediaId,
        featured: r.featured,
      }),
    );
  }
}
