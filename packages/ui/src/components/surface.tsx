import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const surfaceVariants = cva('rounded-xl border transition-colors', {
  variants: {
    variant: {
      /** Opaque panel. */
      solid: 'border-white/10 bg-surface',
      /** Frosted glassmorphic panel over the ink background. */
      glass: 'border-white/10 bg-white/[0.03] backdrop-blur-md supports-[backdrop-filter]:bg-white/[0.04]',
      /** Gold-tinted emphasis panel. */
      gold: 'border-gold/30 bg-gold/[0.06]',
    },
    interactive: {
      true: 'hover:border-gold/40 hover:bg-white/[0.06]',
      false: '',
    },
  },
  defaultVariants: { variant: 'glass', interactive: false },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  as?: React.ElementType;
}

/** Glassmorphic (or solid/gold) panel — the base for cards, callouts, and form shells. */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ as: Tag = 'div', variant, interactive, className, ...props }, ref) => (
    <Tag ref={ref} className={cn(surfaceVariants({ variant, interactive }), className)} {...props} />
  ),
);
Surface.displayName = 'Surface';

export { surfaceVariants };
