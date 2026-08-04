import * as React from 'react';
import { cn } from '../lib/cn';

const spacing = {
  sm: 'py-12 sm:py-16',
  md: 'py-16 sm:py-24',
  lg: 'py-24 sm:py-32',
} as const;

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Semantic element — defaults to <section>. */
  as?: React.ElementType;
  spacing?: keyof typeof spacing;
}

/**
 * Vertical-rhythm landmark. Renders a semantic <section> by default; pass an
 * `aria-label`/`aria-labelledby` so each is a named region for screen readers.
 */
export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ as: Tag = 'section', spacing: s = 'md', className, ...props }, ref) => (
    <Tag ref={ref} className={cn('relative', spacing[s], className)} {...props} />
  ),
);
Section.displayName = 'Section';
