import * as React from 'react';
import { cn } from '../lib/cn';
import { Surface, type SurfaceProps } from './surface';

/** A glass Surface with card padding. Compose with CardBody/CardTitle/CardMeta. */
export interface CardProps extends SurfaceProps {}
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', ...props }, ref) => (
    <Surface
      ref={ref}
      variant={variant}
      className={cn('overflow-hidden', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6', className)} {...props} />
  ),
);
CardBody.displayName = 'CardBody';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display text-xl font-medium text-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardMeta = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm leading-relaxed text-muted', className)} {...props} />
  ),
);
CardMeta.displayName = 'CardMeta';
