import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { NAV_LINKS, SITE } from '../../lib/site';

/** Marketing footer with contact details, nav, and copyright. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-background">
      <Container size="wide" className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-lg tracking-[0.2em] text-foreground">
            {SITE.name.toUpperCase()}
          </p>
          <p className="max-w-xs text-sm text-muted">{SITE.description}</p>
        </div>

        <nav aria-label="Footer" className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Explore</p>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Contact</p>
          <a href={`mailto:${SITE.email}`} className="block text-muted hover:text-foreground">
            {SITE.email}
          </a>
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="block text-muted hover:text-foreground">
            {SITE.phone}
          </a>
          <p className="text-muted">{SITE.locality}</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Start</p>
          <Link href="/contact" className="block text-gold hover:text-gold-light">
            Request a quotation →
          </Link>
        </div>
      </Container>

      <Container size="wide" className="border-t border-white/5 py-6">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
