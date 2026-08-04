import type { CategoryDto, ProjectDto, ProjectListItemDto } from '@fardeen/types';
import type { Category } from '../../domain/entities/category.entity';
import type { Project } from '../../domain/entities/project.entity';

export function toProjectListItemDto(p: Project): ProjectListItemDto {
  return {
    id: p.id,
    slug: p.slug.value,
    title: p.title,
    summary: p.summary,
    categoryId: p.categoryId,
    location: p.location,
    year: p.year,
    coverMediaId: p.coverMediaId,
    status: p.status,
    featured: p.featured,
    metrics: { area: p.metrics.area, durationMonths: p.metrics.durationMonths },
  };
}

export function toProjectDto(p: Project): ProjectDto {
  return { ...toProjectListItemDto(p), body: p.body, galleryMediaIds: p.galleryMediaIds };
}

export function toCategoryDto(c: Category): CategoryDto {
  return { id: c.id, slug: c.slug.value, name: c.name, order: c.order };
}
