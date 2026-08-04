import type { CategoryDto } from '@fardeen/types';
import { cn } from '@fardeen/ui';
import Link from 'next/link';

/**
 * Category filter as real links (`?category=`) so it works with JS disabled and is
 * crawlable; Next client-navigates when JS is on. `aria-current` marks the active chip.
 */
export function CategoryFilter({
  categories,
  active,
}: {
  categories: CategoryDto[];
  active?: string;
}) {
  const chip = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm ring-1 ring-inset transition-colors',
        isActive
          ? 'bg-gold/15 text-gold ring-gold/40'
          : 'text-muted ring-white/15 hover:text-foreground hover:ring-white/30',
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Filter projects by category" className="flex flex-wrap gap-2">
      {chip('/projects', 'All', !active)}
      {categories.map((c) => chip(`/projects?category=${c.slug}`, c.name, active === c.slug))}
    </nav>
  );
}
