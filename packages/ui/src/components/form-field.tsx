import * as React from 'react';
import { cn } from '../lib/cn';

export interface FormFieldProps {
  /** Stable id shared by the label, control (`htmlFor`/`id`), and the error/description ids. */
  htmlFor: string;
  label: React.ReactNode;
  /** Validation message; when present the field is styled + wired as invalid. */
  error?: string;
  /** Helper text shown under the label when there's no error. */
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
  /**
   * Render the control. Receives a11y wiring to spread onto the input:
   * `id`, `aria-invalid`, `aria-describedby`.
   */
  children: (field: {
    id: string;
    required: boolean;
    'aria-required': boolean | undefined;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

/**
 * Accessible label + control + error wrapper. Wires `aria-describedby` to the error
 * (role="alert") or description so screen readers announce validation state.
 */
export function FormField({
  htmlFor,
  label,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const descId = `${htmlFor}-desc`;
  const describedBy = error ? errorId : description ? descId : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-0.5 text-gold" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {description && !error ? (
        <p id={descId} className="text-xs text-muted">
          {description}
        </p>
      ) : null}
      {children({
        id: htmlFor,
        required: Boolean(required),
        'aria-required': required ? true : undefined,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
