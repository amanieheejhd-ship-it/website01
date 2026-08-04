export interface TestimonialProps {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatarMediaId: string | null;
  featured: boolean;
}

/** Testimonial aggregate (docs/DOMAIN-MODEL.md §Content). */
export class Testimonial {
  private constructor(private readonly props: TestimonialProps) {}

  static rehydrate(props: TestimonialProps): Testimonial {
    return new Testimonial(props);
  }

  get id(): string {
    return this.props.id;
  }
  get author(): string {
    return this.props.author;
  }
  get role(): string {
    return this.props.role;
  }
  get company(): string {
    return this.props.company;
  }
  get quote(): string {
    return this.props.quote;
  }
  get rating(): number {
    return this.props.rating;
  }
  get avatarMediaId(): string | null {
    return this.props.avatarMediaId;
  }
  get featured(): boolean {
    return this.props.featured;
  }
}
