import * as React from 'react';
import { cn } from '../lib/cn';

const widths = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
} as const;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a different element (e.g. 'section', 'header'). */
  as?: React.ElementType;
  size?: keyof typeof widths;
}

/** Horizontal max-width wrapper with responsive gutters. Composition primitive for every section. */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ as: Tag = 'div', size = 'default', className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn('mx-auto w-full px-6 sm:px-8 lg:px-10', widths[size], className)}
      {...props}
    />
  ),
);
Container.displayName = 'Container';
