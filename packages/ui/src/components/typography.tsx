import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

/** Small gold, letter-spaced label that sits above a heading. */
export interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: React.ElementType;
}
export const Eyebrow = React.forwardRef<HTMLParagraphElement, EyebrowProps>(
  ({ as: Tag = 'p', className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        'font-display text-xs font-medium uppercase tracking-[0.3em] text-gold',
        className,
      )}
      {...props}
    />
  ),
);
Eyebrow.displayName = 'Eyebrow';

const headingVariants = cva('font-display font-medium leading-tight text-foreground', {
  variants: {
    size: {
      xl: 'text-4xl sm:text-5xl lg:text-6xl',
      lg: 'text-3xl sm:text-4xl lg:text-5xl',
      md: 'text-2xl sm:text-3xl',
      sm: 'text-xl sm:text-2xl',
    },
  },
  defaultVariants: { size: 'lg' },
});

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'color'>,
    VariantProps<typeof headingVariants> {
  /** Heading level — pick for document outline, size for visual scale. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Tag = 'h2', size, className, ...props }, ref) => (
    <Tag ref={ref} className={cn(headingVariants({ size }), className)} {...props} />
  ),
);
Heading.displayName = 'Heading';

/** Balanced intro paragraph under a heading. */
export interface LeadProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export const Lead = React.forwardRef<HTMLParagraphElement, LeadProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('max-w-2xl text-base leading-relaxed text-muted sm:text-lg', className)}
      {...props}
    />
  ),
);
Lead.displayName = 'Lead';

/** Renders trusted HTML (CMS rich text) with tasteful prose defaults. */
export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  html?: string;
}
export const Prose = React.forwardRef<HTMLDivElement, ProseProps>(
  ({ html, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'max-w-2xl space-y-4 text-base leading-relaxed text-muted [&_a]:text-gold [&_a]:underline [&_strong]:text-foreground',
        className,
      )}
      {...(html !== undefined ? { dangerouslySetInnerHTML: { __html: html } } : {})}
      {...props}
    >
      {html === undefined ? children : undefined}
    </div>
  ),
);
Prose.displayName = 'Prose';
