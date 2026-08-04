import { cn } from '@fardeen/ui';
import Link from 'next/link';

function buildHref(page: number, category?: string): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/projects?${qs}` : '/projects';
}

/** Link-based pagination — works without JS, client-navigates with it. */
export function Pagination({
  page,
  total,
  limit,
  category,
}: {
  page: number;
  total: number;
  limit: number;
  category?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (pages <= 1) return null;

  const item = (label: string, target: number, disabled: boolean, isCurrent = false) =>
    disabled ? (
      <span
        aria-disabled="true"
        className="rounded-md px-3 py-1.5 text-sm text-muted/40"
      >
        {label}
      </span>
    ) : (
      <Link
        href={buildHref(target, category)}
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm ring-1 ring-inset transition-colors',
          isCurrent
            ? 'bg-gold/15 text-gold ring-gold/40'
            : 'text-muted ring-white/15 hover:text-foreground hover:ring-white/30',
        )}
      >
        {label}
      </Link>
    );

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      {item('← Prev', page - 1, page <= 1)}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) =>
        item(String(p), p, false, p === page),
      )}
      {item('Next →', page + 1, page >= pages)}
    </nav>
  );
}
