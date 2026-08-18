import { Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Reference-style "Everything Under One Roof" band: 8 gold line-icon tiles (same thin-stroke SVG
 * language as the hero tools cluster — code-drawn, no image files), each linking to /services.
 * Hover: gold glow. Server component — all interactivity is pure CSS.
 */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

interface RoofService {
  label: string;
  /** CANONICAL tile→discipline mapping: the slug of the matching CORE_SERVICES entry on /services.
   *  Every tile deep-links to /services#<slug>, which lands with that discipline's accordion panel
   *  already open (see components/services/disciplines.tsx). Mapped by meaning:
   *  Construction→Turnkey Home Construction · Aluminium works→Aluminium Doors, Windows & Systems ·
   *  Glass solutions→Architectural Glass Work · Interior design→Interior Design & Execution ·
   *  False ceiling→False Ceiling, Gypsum & Decorative Ceilings · ACP cladding→ACP, Cladding &
   *  Facade Work · Railings→Railings, Gates & Metal Works · Renovation→Flooring, Painting,
   *  Finishes & Renovation. */
  slug: string;
  icon: ReactNode;
}

const ROOF_SERVICES: RoofService[] = [
  {
    label: 'Construction',
    slug: 'turnkey-home-construction',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v10h13V10" />
        <path d="M10 20v-5.5h4V20" />
      </svg>
    ),
  },
  {
    label: 'Aluminium works',
    slug: 'aluminium-systems',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M12 4v16M4 12h16" />
        <path d="M7 7.5h2M15 16.5h2" />
      </svg>
    ),
  },
  {
    label: 'Glass solutions',
    slug: 'architectural-glass-work',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <rect x="5" y="3.5" width="14" height="17" rx="1" />
        <path d="m8 13 5-6M11 17.5l6-7.5" />
      </svg>
    ),
  },
  {
    label: 'Interior design',
    slug: 'interior-design-execution',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M4 12v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
        <path d="M3.5 17.5v-3a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v3" />
        <path d="M5 17.5V19M19 17.5V19" />
        <path d="M6.5 9V7.5A2.5 2.5 0 0 1 9 5h6a2.5 2.5 0 0 1 2.5 2.5V9" />
      </svg>
    ),
  },
  {
    label: 'False ceiling',
    slug: 'false-ceiling-gypsum',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M3 5h18" />
        <path d="M6 5v3M12 5v3M18 5v3" />
        <path d="M9 8h6v2H9z" />
        <path d="M12 13v1.5" />
        <path d="m9.5 18 .8-2M14.5 18l-.8-2" />
      </svg>
    ),
  },
  {
    label: 'ACP cladding',
    slug: 'acp-cladding-facades',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M4 4h7v7H4z" />
        <path d="M13 4h7v7h-7z" />
        <path d="M4 13h7v7H4z" />
        <path d="M13 13h7v7h-7z" />
        <path d="m15 6.5 3 3" />
      </svg>
    ),
  },
  {
    label: 'Railings',
    slug: 'railings-gates-metal-work',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M3 7.5c3-2.5 15-2.5 18 0" />
        <path d="M4.5 6.6V20M9.25 5.6V20M14.75 5.6V20M19.5 6.6V20" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  {
    label: 'Renovation',
    slug: 'flooring-finishes-renovation',
    icon: (
      <svg className="h-full w-full" viewBox="0 0 24 24" {...S}>
        <path d="M4 5.5h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8" />
        <path d="M4 5.5v5" />
        <path d="M11 10.5v2.5" />
        <path d="M9.5 13h3v7.5h-3z" />
      </svg>
    ),
  },
];

export function UnderOneRoofSection() {
  return (
    <Section spacing="lg" aria-labelledby="roof-heading">
      <Container size="wide">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="roof-heading" className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Everything Under One Roof
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              From structure to final styling — every trade under one accountable team.
            </p>
          </div>
          <span aria-hidden="true" className="hidden h-px w-40 bg-gold/40 sm:block" />
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {ROOF_SERVICES.map((service) => (
            <li key={service.label}>
              <Link
                href={`/services#${service.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-lg border border-gold/20 bg-surface/40 px-3 py-6 text-center transition-[border-color,box-shadow,background-color] duration-200 hover:border-gold/60 hover:bg-gold/5 hover:shadow-[0_0_34px_-10px_rgba(200,161,90,0.65)]"
              >
                <span className="h-9 w-9 text-gold transition-colors duration-200 group-hover:text-gold-light">
                  {service.icon}
                </span>
                <span className="text-[0.58rem] uppercase leading-relaxed tracking-[0.18em] text-muted transition-colors duration-200 group-hover:text-foreground">
                  {service.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
