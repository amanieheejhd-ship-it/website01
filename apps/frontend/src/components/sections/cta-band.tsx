import { Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { SITE } from '../../lib/site';

/**
 * Reference-style closing CTA band: "Let's Build Something Amazing Together" + gold GET A QUOTE +
 * phone, sitting directly above the footer. Server component — pure markup/CSS.
 */
export function CtaBandSection() {
  const tel = SITE.phone.replace(/\s/g, '');
  return (
    <Section spacing="md" aria-labelledby="cta-band-heading">
      <Container size="wide">
        <div className="flex flex-col items-center gap-7 rounded-xl border border-gold/20 bg-surface/40 px-6 py-10 text-center sm:flex-row sm:justify-between sm:px-10 sm:text-left">
          <h2
            id="cta-band-heading"
            className="max-w-xl font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl"
          >
            Let&apos;s Build Something Amazing Together
          </h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/contact?subject=Request a quotation"
              className="premium-cta whitespace-nowrap rounded-full bg-gold px-8 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black"
            >
              Get a quote
            </Link>
            <a
              href={`tel:${tel}`}
              className="group flex items-center gap-2.5 whitespace-nowrap text-sm text-muted transition-colors duration-200 hover:text-foreground"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/40 text-gold transition-colors duration-200 group-hover:border-gold">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.97.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.83.57 2.8.7a2 2 0 0 1 1.7 2.05z" />
                </svg>
              </span>
              {SITE.phone}
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
