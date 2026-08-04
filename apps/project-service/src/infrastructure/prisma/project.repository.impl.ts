import { Injectable } from '@nestjs/common';
import type { ProjectStatus } from '@fardeen/types';
import { Category } from '../../domain/entities/category.entity';
import { Project } from '../../domain/entities/project.entity';
import type {
  CategoryRepository,
  ProjectListFilter,
  ProjectRepository,
} from '../../domain/repositories/project.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import { PrismaService } from './prisma.service';

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  location: string;
  year: number;
  coverMediaId: string | null;
  galleryMediaIds: string[];
  status: string;
  featured: boolean;
  metricsArea: string | null;
  metricsDurationMonths: number | null;
}
interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  order: number;
}

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ProjectListFilter): Promise<{ items: Project[]; total: number }> {
    const where = {
      ...(filter.includeUnpublished ? {} : { status: 'published' }),
      ...(filter.categorySlug ? { category: { slug: filter.categorySlug } } : {}),
      ...(filter.featured !== undefined ? { featured: filter.featured } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { year: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items: rows.map((r: ProjectRow) => this.toDomain(r)), total };
  }

  async findBySlug(slug: Slug, includeUnpublished: boolean): Promise<Project | null> {
    const r = await this.prisma.project.findUnique({ where: { slug: slug.value } });
    if (!r) return null;
    if (!includeUnpublished && r.status !== 'published') return null;
    return this.toDomain(r as ProjectRow);
  }

  async findById(id: string): Promise<Project | null> {
    const r = await this.prisma.project.findUnique({ where: { id } });
    return r ? this.toDomain(r as ProjectRow) : null;
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    return (await this.prisma.project.count({ where: { slug: slug.value } })) > 0;
  }

  async save(p: Project): Promise<void> {
    const data = {
      slug: p.slug.value,
      title: p.title,
      summary: p.summary,
      body: p.body,
      categoryId: p.categoryId,
      location: p.location,
      year: p.year,
      coverMediaId: p.coverMediaId,
      galleryMediaIds: p.galleryMediaIds,
      status: p.status,
      featured: p.featured,
      metricsArea: p.metrics.area,
      metricsDurationMonths: p.metrics.durationMonths,
    };
    await this.prisma.project.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
  }

  async remove(id: string): Promise<boolean> {
    const res = await this.prisma.project.deleteMany({ where: { id } });
    return res.count > 0;
  }

  private toDomain(r: ProjectRow): Project {
    return Project.rehydrate({
      id: r.id,
      slug: Slug.create(r.slug),
      title: r.title,
      summary: r.summary,
      body: r.body,
      categoryId: r.categoryId,
      location: r.location,
      year: r.year,
      coverMediaId: r.coverMediaId,
      galleryMediaIds: r.galleryMediaIds,
      status: r.status as ProjectStatus,
      featured: r.featured,
      metrics: { area: r.metricsArea, durationMonths: r.metricsDurationMonths },
    });
  }
}

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listOrdered(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { order: 'asc' } });
    return rows.map((r: CategoryRow) =>
      Category.rehydrate({ id: r.id, slug: Slug.create(r.slug), name: r.name, order: r.order }),
    );
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.category.count({ where: { id } })) > 0;
  }
}
