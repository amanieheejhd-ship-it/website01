import type { PageStatus, SectionType } from '@fardeen/types';
import type { Slug } from '../value-objects/slug.vo';

export interface Seo {
  title: string;
  description: string;
  ogImageMediaId: string | null;
}

export interface Section {
  id: string;
  type: SectionType;
  order: number;
  payload: unknown;
  mediaRefs: string[];
}

export interface PageProps {
  id: string;
  slug: Slug;
  title: string;
  status: PageStatus;
  seo: Seo;
  sections: Section[];
}

/** Page aggregate (docs/DOMAIN-MODEL.md §Content). Invariant: only published pages are public;
 *  section order is unique per page (enforced by the repository's @@unique). */
export class Page {
  private constructor(private readonly props: PageProps) {}

  static create(props: PageProps): Page {
    return new Page(props);
  }
  static rehydrate(props: PageProps): Page {
    return new Page(props);
  }

  isPublished(): boolean {
    return this.props.status === 'published';
  }
  publish(): void {
    this.props.status = 'published';
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
  get status(): PageStatus {
    return this.props.status;
  }
  get seo(): Seo {
    return this.props.seo;
  }
  /** Sections ordered by their `order`. */
  get sections(): Section[] {
    return [...this.props.sections].sort((a, b) => a.order - b.order);
  }
}
