'use client';

import { Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { useRef } from 'react';

/**
 * Reference-style "Our Featured Projects" carousel. Cards are CODE-DRAWN architectural plates —
 * gold line elevations / floor plans in SVG (no photographs, no image files, per the owner's hard
 * rule). Content is CURATED LOCAL DATA only: nothing here reads the DB, so test entries can never
 * leak onto the homepage. Gold arrow buttons scroll the snap track; the track itself is natively
 * swipeable on touch.
 */

interface FeaturedProject {
  name: string;
  location: string;
  year: number;
  plate: 'elevation-a' | 'elevation-b' | 'plan';
}

/** OWNER-EDITABLE: curated showcase projects (name · location · year). Local content only. */
const PROJECTS: FeaturedProject[] = [
  { name: 'Skyline Residence', location: 'Zirakpur', year: 2024, plate: 'elevation-a' },
  { name: 'Courtyard Villa', location: 'Panchkula', year: 2023, plate: 'plan' },
  { name: 'Glasshouse Duplex', location: 'Mohali', year: 2024, plate: 'elevation-b' },
  { name: 'Terrace House', location: 'Chandigarh', year: 2022, plate: 'elevation-a' },
  { name: 'Modern Farmhouse', location: 'Dera Bassi', year: 2023, plate: 'plan' },
  { name: 'Twin Court Villas', location: 'Zirakpur', year: 2025, plate: 'elevation-b' },
];

const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Flat-roof modern villa front elevation — gold line drawing. */
function PlateElevationA() {
  return (
    <svg viewBox="0 0 400 280" className="h-full w-full text-gold" {...P} aria-hidden="true">
      {/* ground + faint site lines */}
      <path d="M20 240h360" />
      <path d="M20 252h140M260 252h120" opacity="0.35" />
      {/* main two-storey mass */}
      <path d="M60 240V96h180v144" />
      <path d="M60 96h180" />
      {/* upper setback volume */}
      <path d="M96 96V56h190v184" opacity="0.9" />
      <path d="M96 56h190" />
      {/* roof slab overhangs */}
      <path d="M88 96h196M52 240h242" opacity="0.7" />
      {/* window bands */}
      <path d="M116 72h64v14h-64zM196 72h64v14h-64z" opacity="0.85" />
      <path d="M80 120h56v52H80z" />
      <path d="M80 146h56M108 120v52" opacity="0.6" />
      {/* entry door + canopy */}
      <path d="M160 240v-56h34v56" />
      <path d="M150 178h54" opacity="0.8" />
      {/* cladding fins on right wing */}
      <path d="M256 116v108M268 116v108M280 116v108" opacity="0.5" />
      {/* pool deck hint */}
      <path d="M300 240v-20h64v20" opacity="0.6" />
      <path d="M306 232h52" opacity="0.35" />
    </svg>
  );
}

/** Balcony + stair duplex elevation — gold line drawing. */
function PlateElevationB() {
  return (
    <svg viewBox="0 0 400 280" className="h-full w-full text-gold" {...P} aria-hidden="true">
      <path d="M20 240h360" />
      <path d="M40 252h120M300 252h60" opacity="0.35" />
      {/* stepped massing */}
      <path d="M70 240V70h150v170" />
      <path d="M220 240V120h110v120" />
      <path d="M70 70h150M220 120h110" />
      {/* balcony with railing */}
      <path d="M70 150h150" opacity="0.9" />
      <path d="M84 150v-16M100 150v-16M116 150v-16M132 150v-16M148 150v-16M164 150v-16M180 150v-16M196 150v-16" opacity="0.55" />
      <path d="M78 134h136" />
      {/* glazing grid upper */}
      <path d="M92 86h108v36H92z" />
      <path d="M128 86v36M164 86v36M92 104h108" opacity="0.6" />
      {/* ground glazing + door */}
      <path d="M88 240v-52h56v52" />
      <path d="M160 240v-64h44v64" opacity="0.85" />
      {/* external stair */}
      <path d="M236 240v-10h14v-10h14v-10h14v-10h14v-10h14v-10h14" opacity="0.8" />
      {/* right-wing windows */}
      <path d="M244 140h70v28h-70z" />
      <path d="M279 140v28" opacity="0.6" />
    </svg>
  );
}

/** Ground-floor plan with door arcs + furniture hints — gold line drawing. */
function PlatePlan() {
  return (
    <svg viewBox="0 0 400 280" className="h-full w-full text-gold" {...P} aria-hidden="true">
      {/* outer walls */}
      <path d="M50 30h300v220H50z" />
      {/* internal partitions */}
      <path d="M50 150h120M210 150h140" opacity="0.9" />
      <path d="M170 150v100M230 30v70" opacity="0.9" />
      <path d="M230 130v20" opacity="0.9" />
      {/* door arcs */}
      <path d="M170 170a20 20 0 0 1 20 20" opacity="0.7" />
      <path d="M230 110a20 20 0 0 1-20-20" opacity="0.7" />
      <path d="M195 30a22 22 0 0 0 22 22" opacity="0.7" />
      {/* living sofa */}
      <path d="M70 60h70v26H70z" />
      <path d="M70 60v-10h70v10" opacity="0.6" />
      {/* dining table + chairs */}
      <circle cx="185" cy="95" r="20" />
      <path d="M185 65v-6M185 125v6M155 95h-6M215 95h6" opacity="0.6" />
      {/* kitchen counter */}
      <path d="M250 40h90v22" opacity="0.9" />
      <path d="M264 40v22M282 40v22M300 40v22M318 40v22" opacity="0.4" />
      {/* bed */}
      <path d="M80 180h64v50H80z" />
      <path d="M80 194h64" opacity="0.6" />
      <path d="M86 180v-8h20v8M118 180v-8h20v8" opacity="0.5" />
      {/* washroom fixtures */}
      <path d="M250 170h40v24h-40z" opacity="0.8" />
      <circle cx="320" cy="182" r="10" opacity="0.8" />
      {/* dimension ticks */}
      <path d="M50 264h300" opacity="0.35" />
      <path d="M50 258v12M200 258v12M350 258v12" opacity="0.35" />
    </svg>
  );
}

const PLATES = {
  'elevation-a': PlateElevationA,
  'elevation-b': PlateElevationB,
  plan: PlatePlan,
} as const;

export function FeaturedProjectsSection() {
  const trackRef = useRef<HTMLUListElement>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('li');
    const step = (card?.clientWidth ?? 320) + 24;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const arrow =
    'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 text-gold transition-colors duration-200 hover:border-gold hover:bg-gold/10 disabled:opacity-40';

  return (
    <Section spacing="lg" aria-labelledby="featured-projects-heading">
      <Container size="wide">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2
              id="featured-projects-heading"
              className="font-display text-3xl font-bold text-foreground sm:text-4xl"
            >
              Our Featured Projects
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Signature residences and commercial builds from our drawing board — see the full
              portfolio on the projects page.
            </p>
          </div>
          <div className="hidden gap-3 sm:flex">
            <button type="button" onClick={() => scrollByCard(-1)} className={arrow} aria-label="Previous projects">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button type="button" onClick={() => scrollByCard(1)} className={arrow} aria-label="Next projects">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <ul
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PROJECTS.map((project) => {
            const Plate = PLATES[project.plate];
            return (
              <li key={project.name} className="w-[280px] shrink-0 snap-start sm:w-[340px]">
                <Link
                  href="/projects"
                  data-premium-card
                  className="block h-full overflow-hidden rounded-lg border border-gold/20 bg-surface/40"
                >
                  <div className="aspect-[4/3] w-full border-b border-gold/15 bg-[radial-gradient(70%_60%_at_50%_40%,rgba(200,161,90,0.07),transparent_75%)] p-6">
                    <Plate />
                  </div>
                  <div className="flex items-baseline justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-display text-lg font-semibold text-foreground">{project.name}</p>
                      <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.2em] text-muted">
                        {project.location}
                      </p>
                    </div>
                    <p className="font-display text-sm text-gold">{project.year}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
