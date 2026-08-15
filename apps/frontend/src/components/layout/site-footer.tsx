import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { NAV_LINKS, SITE } from '../../lib/site';

/** Marketing footer with contact details, nav, and copyright. */
export function SiteFooter() {
  return (
    <footer>
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

        {/* Compact square location map (replaces the old "Start" column). */}
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Visit us</p>
          <div className="w-full max-w-[300px] overflow-hidden rounded-xl border border-gold/25 bg-surface shadow-[0_0_40px_-16px_rgba(200,161,90,0.35)]">
            <iframe
              title={`Map of ${SITE.locality}`}
              src={SITE.mapEmbedUrl}
              className="block aspect-square w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <p className="text-muted">{SITE.locality}</p>
          <a
            href={SITE.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded text-gold transition-colors hover:text-gold-light"
          >
            Get directions →
          </a>
        </div>
      </Container>

      <Container size="wide" className="py-6">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
