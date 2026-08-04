import type { Category } from '../entities/category.entity';
import type { Project } from '../entities/project.entity';
import type { Slug } from '../value-objects/slug.vo';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface ProjectListFilter {
  categorySlug?: string;
  featured?: boolean;
  page: number;
  limit: number;
  includeUnpublished: boolean;
}

export interface ProjectRepository {
  list(filter: ProjectListFilter): Promise<{ items: Project[]; total: number }>;
  findBySlug(slug: Slug, includeUnpublished: boolean): Promise<Project | null>;
  findById(id: string): Promise<Project | null>;
  existsBySlug(slug: Slug): Promise<boolean>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<boolean>;
}

export interface CategoryRepository {
  listOrdered(): Promise<Category[]>;
  exists(id: string): Promise<boolean>;
}
