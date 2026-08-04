import * as React from 'react';
import { cn } from '../lib/cn';

const fieldBase =
  'w-full rounded-md border border-white/15 bg-white/[0.03] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-colors focus-visible:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-500/70 aria-[invalid=true]:focus-visible:ring-red-500/40';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Text input styled for the ink/gold system. Pass `aria-invalid` to surface an error ring. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export { fieldBase };
