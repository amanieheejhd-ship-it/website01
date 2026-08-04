import type { ReactNode } from 'react';
import { SiteFooter } from '../../components/layout/site-footer';
import { SiteHeader } from '../../components/layout/site-header';

/** Marketing shell: header + main landmark + footer around every public page. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
