import * as React from 'react';
import { cn } from '../lib/cn';
import { fieldBase } from './input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** Multi-line text field sharing the Input styling. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(fieldBase, 'resize-y', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
