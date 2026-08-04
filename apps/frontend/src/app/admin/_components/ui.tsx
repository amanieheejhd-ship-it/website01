/**
 * Admin-local presentational primitives that @fardeen/ui doesn't ship. They reuse the design-system
 * tokens + helpers (cn, fieldBase, buttonVariants, Surface) so they stay visually consistent with
 * the ink/gold language. Directive-free (server- or client-renderable); on* handlers are supplied by
 * client callers. Interactive/stateful primitives live in ./toast and ./modal.
 */
import * as React from 'react';
import { cn, fieldBase } from '@fardeen/ui';

/* ------------------------------------------------------------------ Spinner */
export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <svg className="h-4 w-4 animate-spin text-gold" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ PageHeader */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl font-medium text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ StatTile */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/[0.03] p-5', className)}>
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-medium leading-none text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ EmptyState */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center', className)}>
      <p className="font-display text-lg text-foreground">{title}</p>
      {description ? <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Table family */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className={cn('w-full min-w-[40rem] border-collapse text-left text-sm', className)}>{children}</table>
    </div>
  );
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted">{children}</thead>;
}
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-white/5">{children}</tbody>;
}
export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-white/[0.02]', className)}>{children}</tr>;
}
export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={cn('whitespace-nowrap px-4 py-3 font-medium', className)}>{children}</th>;
}
export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle text-foreground/90', className)}>{children}</td>;
}

/* ------------------------------------------------------------------ StatusBadge */
const STATUS_TONE: Record<string, string> = {
  // published / positive
  published: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  active: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  won: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  quoted: 'bg-gold/15 text-gold ring-gold/30',
  reviewing: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  requested: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  new: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  read: 'bg-white/10 text-foreground/80 ring-white/15',
  // drafts / neutral / negative
  draft: 'bg-white/10 text-muted ring-white/15',
  inactive: 'bg-white/10 text-muted ring-white/15',
  archived: 'bg-white/10 text-muted ring-white/15',
  lost: 'bg-red-500/15 text-red-300 ring-red-500/30',
};
export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'bg-white/10 text-foreground/80 ring-white/15';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', tone)}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ Select (native, styled) */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, 'appearance-none pr-9', className)} {...props}>
        {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
      >
        <path fillRule="evenodd" d="M5.2 7.5 10 12.3l4.8-4.8 1 1L10 14.3 4.2 8.5z" clipRule="evenodd" />
      </svg>
    </div>
  );
});

/* ------------------------------------------------------------------ Switch (toggle) */
export function Switch({
  checked,
  onChange,
  disabled,
  id,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-gold' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-black shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ Pagination */
export function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const btn = 'rounded-md border border-white/15 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span className="tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
