import { Container } from '@fardeen/ui';
import Link from 'next/link';
import { CORE_SERVICES } from '../services/services-content';
import { SITE } from '../../lib/site';
import { LocationMap } from './location-map';

/**
 * Footer v3 — mirrors the owner's reference footer structure on the ink/gold theme: bold uppercase
 * gold column headers, simple tidy link lists (no numerals, no extra CTAs), even vertical rhythm,
 * top-aligned balanced columns, thin hairline + copyright bottom bar.
 *
 * ZERO-DUPLICATION RULE: every piece of information appears exactly once — phone, email, WhatsApp
 * and the address live ONLY in "Connect / visit us"; the brand column carries only the wordmark, a
 * two-line blurb and one gold "Get a quote →" link. Every link points to a real destination.
 */

/** Design credit shown in the bottom bar. OWNER: set to null to remove it. */
const DESIGN_CREDIT: string | null = 'Designed & built by Growblic';

const WHATSAPP_URL = `https://wa.me/${SITE.phone.replace(/[^\d]/g, '')}`;

/** Two-line brand blurb (footer-local; the long SITE.description stays for SEO metadata). */
const BRAND_BLURB =
  'Full-solution construction and interiors — one accountable team from foundation to finish.';

const COMPANY_LINKS = [
  // "About us" points at the services intro — the truest existing description of the company.
  { href: '/services', label: 'About us' },
  { href: '/services#process-heading', label: 'Our process' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
] as const;

const colHeader = 'text-[0.62rem] font-bold uppercase tracking-[0.26em] text-gold';
const linkCls =
  'flex min-h-11 items-center text-sm text-muted transition-colors hover:text-foreground';

export function SiteFooter() {
  return (
    <footer>
      <Container
        size="wide"
        className="grid grid-cols-1 items-start gap-x-8 gap-y-12 py-16 sm:grid-cols-2 lg:grid-cols-12"
      >
        {/* 1 — Brand: wordmark + 2-line blurb + one gold CTA. Nothing else. */}
        <div className="lg:col-span-3">
          <p className="font-display text-lg tracking-[0.2em] text-foreground">
            {SITE.name.toUpperCase()}
          </p>
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{BRAND_BLURB}</p>
          <Link
            href="/contact?subject=Request a quotation"
            className="mt-3 inline-flex min-h-11 items-center rounded text-sm font-medium text-gold transition-colors hover:text-gold-light"
          >
            Get a quote →
          </Link>
        </div>

        {/* 2 — Company */}
        <nav aria-label="Company" className="lg:col-span-2">
          <h3 className={colHeader}>Company</h3>
          <ul className="mt-4">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={linkCls}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 3 — Services: plain tidy two-column list; deep-links open each discipline's panel. */}
        <nav aria-label="Services" className="lg:col-span-3">
          <h3 className={colHeader}>Services</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-6">
            {CORE_SERVICES.map((service) => (
              <li key={service.slug}>
                <Link href={`/services#${service.slug}`} className={linkCls}>
                  {service.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 4 — Trust & legal */}
        <nav aria-label="Trust and legal" className="lg:col-span-2">
          <h3 className={colHeader}>Trust &amp; legal</h3>
          <ul className="mt-4">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkCls}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 5 — Connect / visit us: the ONLY place contact details appear; small tidy map last. */}
        <div className="lg:col-span-2">
          <h3 className={colHeader}>Connect / visit us</h3>
          <ul className="mt-4">
            <li>
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className={linkCls}>
                Call {SITE.phone}
              </a>
            </li>
            <li>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center text-sm text-gold transition-colors hover:text-gold-light"
              >
                WhatsApp us
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className={`${linkCls} break-all`}>
                {SITE.email}
              </a>
            </li>
          </ul>
          <LocationMap className="mt-3 w-full max-w-[300px] sm:max-w-[220px]" />
        </div>
      </Container>

      {/* Bottom bar — thin hairline, copyright left, removable credit right. */}
      <Container size="wide">
        <div className="flex flex-col gap-2 border-t border-gold/15 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          {DESIGN_CREDIT ? <p>{DESIGN_CREDIT}</p> : null}
        </div>
      </Container>
    </footer>
  );
}
