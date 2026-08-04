import { ValidationError } from '@fardeen/shared';
import type { ProjectStatus } from '@fardeen/types';
import type { Slug } from '../value-objects/slug.vo';

export interface ProjectMetrics {
  area: string | null;
  durationMonths: number | null;
}

export interface ProjectProps {
  id: string;
  slug: Slug;
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  location: string;
  year: number;
  coverMediaId: string | null;
  galleryMediaIds: string[];
  status: ProjectStatus;
  featured: boolean;
  metrics: ProjectMetrics;
}

/**
 * Project aggregate root (docs/DOMAIN-MODEL.md §Portfolio).
 * Invariants: slug unique (repository); a featured project must be published and have a cover.
 */
export class Project {
  private constructor(private readonly props: ProjectProps) {}

  static create(props: ProjectProps): Project {
    const p = new Project(props);
    p.assertInvariants();
    return p;
  }
  static rehydrate(props: ProjectProps): Project {
    return new Project(props);
  }

  private assertInvariants(): void {
    if (this.props.featured && (this.props.status !== 'published' || !this.props.coverMediaId)) {
      throw new ValidationError('A featured project must be published and have a cover image');
    }
  }

  isPublished(): boolean {
    return this.props.status === 'published';
  }

  get id(): string {
    return this.props.id;
  }
  get slug(): Slug {
    return this.props.slug;
  }
  get title(): string {
    return this.props.title;
  }
  get summary(): string {
    return this.props.summary;
  }
  get body(): string {
    return this.props.body;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get location(): string {
    return this.props.location;
  }
  get year(): number {
    return this.props.year;
  }
  get coverMediaId(): string | null {
    return this.props.coverMediaId;
  }
  get galleryMediaIds(): string[] {
    return this.props.galleryMediaIds;
  }
  get status(): ProjectStatus {
    return this.props.status;
  }
  get featured(): boolean {
    return this.props.featured;
  }
  get metrics(): ProjectMetrics {
    return this.props.metrics;
  }
}
