import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tracking-wide',
  {
    variants: {
      variant: {
        gold: 'bg-gold/15 text-gold ring-1 ring-inset ring-gold/30',
        outline: 'text-muted ring-1 ring-inset ring-white/15',
        solid: 'bg-white/10 text-foreground',
      },
    },
    defaultVariants: { variant: 'gold' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Small pill for categories, statuses, and metadata. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = 'Badge';

export { badgeVariants };
