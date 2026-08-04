import type { Slug } from '../value-objects/slug.vo';

export interface CategoryProps {
  id: string;
  slug: Slug;
  name: string;
  order: number;
}

/** Category aggregate (docs/DOMAIN-MODEL.md §Portfolio). */
export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(props: CategoryProps): Category {
    return new Category(props);
  }
  static rehydrate(props: CategoryProps): Category {
    return new Category(props);
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
  get order(): number {
    return this.props.order;
  }
}
