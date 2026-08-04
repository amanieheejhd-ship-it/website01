import Link from 'next/link';
import { buttonVariants } from '@fardeen/ui';

/**
 * Root 404 — rendered inside the root layout (no marketing shell), so it covers unmatched paths
 * anywhere (incl. /admin/*). Also required for a clean `next build`: without a root not-found the
 * App Router falls back to the pages-based default and trips "<Html> should not be imported".
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-display text-xs font-medium uppercase tracking-[0.3em] text-gold">404</p>
      <h1 className="mt-3 font-display text-3xl font-medium text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-6' })}>
        Back home
      </Link>
    </main>
  );
}
