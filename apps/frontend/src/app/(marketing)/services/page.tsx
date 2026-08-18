import type { Metadata } from 'next';
import type { ServiceOfferingDto } from '@fardeen/types';
import { buttonVariants, Container, Heading, Section } from '@fardeen/ui';
import Link from 'next/link';
import { JsonLd } from '../../../components/seo/json-ld';
import { DisciplinesSection } from '../../../components/services/disciplines';
import { ServicesFaq } from '../../../components/services/services-faq';
import { getServices, type ListResponse } from '../../../lib/api';
import { serviceJsonLd } from '../../../lib/seo';
import { SITE } from '../../../lib/site';
import styles from './services-page.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: `Construction & Interior Services | ${SITE.name}` },
  description:
    'Complete construction, interiors, modular kitchens, aluminium, glass, ACP cladding, steel fabrication and renovation services from Ansari Space Craft.',
  alternates: { canonical: '/services' },
};

async function safeServices(): Promise<ListResponse<ServiceOfferingDto>> {
  try {
    return await getServices();
  } catch {
    return { data: [], meta: { requestId: '' } };
  }
}

const STEPS = [
  ['01', 'Understand the project', 'We listen to the brief, priorities, intended use, budget direction and desired finish.'],
  ['02', 'Site visit & scope', 'Measurements and existing conditions turn the initial conversation into a defined work scope.'],
  ['03', 'Estimate & planning', 'The required trades, materials, sequencing and commercial proposal are coordinated before execution.'],
  ['04', 'Execution & coordination', 'Site teams and specialist packages work to one practical sequence with regular decisions tracked.'],
  ['05', 'Finishing & handover', 'Final surfaces, fittings and snag items are reviewed before the completed scope is handed over.'],
] as const;

const PROJECT_TYPES = [
  ['Residential', 'Villas', 'Independent houses', 'Apartments', 'Renovations'],
  ['Commercial', 'Offices', 'Retail', 'Showrooms', 'Commercial interiors'],
  ['Specialist works', 'Facades', 'Glass & aluminium', 'Fabrication', 'Modular installations'],
] as const;

const QUALITY_AREAS = [
  'Structural and civil materials',
  'Hardware and moving systems',
  'Aluminium and glass assemblies',
  'Boards, laminates and surfaces',
  'Flooring and sanitary fittings',
  'Electrical and paint systems',
] as const;

const REASONS = [
  ['One accountable team', 'A single execution relationship across the agreed scope.'],
  ['Coordinated trades', 'Civil, services, fabrication and finishes planned in sequence.'],
  ['Design-to-execution continuity', 'Practical detailing stays connected to what is built on site.'],
  ['Detailed finishing', 'Junctions, alignment and final fit receive the same attention as major work.'],
  ['Clear project scope', 'Responsibilities and inclusions are defined before work progresses.'],
  ['Residential + commercial', 'Capability across homes, renovations, offices, retail and specialist packages.'],
] as const;

export default async function ServicesPage() {
  const { data: cmsOfferings } = await safeServices();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Container size="wide">
          <p className="font-display text-xs font-medium uppercase tracking-[0.32em] text-gold">What we do</p>
          <h1 className="mt-6 max-w-5xl text-balance font-display text-4xl font-medium leading-[1.02] text-foreground sm:text-5xl lg:text-7xl">
            Full-solution construction,
            <br />
            foundation to finish
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">
            One accountable team for construction, interiors, fabrication, finishing and specialist building works.
          </p>
          <p className="mt-4 max-w-3xl border-l border-gold/50 pl-5 leading-relaxed text-muted/80">
            From civil structure and MEP to interiors, facades and final detailing—coordinated under one execution team.
          </p>
        </Container>
      </header>

      {/* Discipline index + EXCLUSIVE detail accordion (one panel open at a time). */}
      <DisciplinesSection />

      <Section aria-labelledby="turnkey-heading" className="border-y border-gold/20 bg-gold/[0.035]">
        <Container size="wide" className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Turnkey delivery</p>
            <Heading id="turnkey-heading" className="mt-4">One project.<br />One coordinated team.</Heading>
          </div>
          <div>
            <p className="max-w-3xl text-lg leading-8 text-muted">Instead of separately managing civil contractors, electricians, plumbers, fabricators, interior teams and finishing vendors, Ansari Space Craft can coordinate the required scope through one execution workflow.</p>
            <ol className="mt-10 grid grid-cols-5 border-y border-gold/20 py-6 text-center text-xs uppercase tracking-[0.12em] text-foreground sm:text-sm sm:tracking-[0.2em]">
              {['Plan', 'Build', 'Install', 'Finish', 'Handover'].map((item, index) => <li key={item} className="relative px-1">{item}{index < 4 ? <span aria-hidden="true" className="absolute -right-1 text-gold">→</span> : null}</li>)}
            </ol>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="process-heading">
        <Container size="wide">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">How we work</p>
          <Heading id="process-heading" className="mt-4 scroll-mt-24">A clear route from brief to handover</Heading>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-5">
            {STEPS.map(([number, title, copy]) => <li key={number} className="bg-background p-6 lg:p-8"><span className="font-display text-2xl text-gold">{number}</span><h3 className="mt-8 text-lg font-medium text-foreground">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{copy}</p></li>)}
          </ol>
        </Container>
      </Section>

      <Section aria-labelledby="quality-heading" className="bg-white/[0.018]">
        <Container size="wide" className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Material & quality approach</p>
            <Heading id="quality-heading" className="mt-4">Specified for the place it has to perform</Heading>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">Material selection is balanced across use, exposure, maintenance, finish and the agreed budget. Good execution begins beneath the visible surface—with the right substrate, fixing, alignment and preparation.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {QUALITY_AREAS.map((item, index) => <li key={item} className="flex min-h-24 items-end justify-between border border-white/10 p-5 text-sm text-foreground"><span>{item}</span><span className="font-display text-gold/60">0{index + 1}</span></li>)}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="project-types-heading">
        <Container size="wide">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Project types</p>
          <Heading id="project-types-heading" className="mt-4">Capability across complete spaces and specialist work</Heading>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROJECT_TYPES.map(([title, ...items], index) => <article key={title} className="border-t border-gold/40 bg-white/[0.02] p-7 sm:p-9"><span className="font-display text-4xl text-gold/40">0{index + 1}</span><h3 className="mt-8 font-display text-3xl text-foreground">{title}</h3><ul className="mt-6 space-y-3 text-muted">{items.map((item) => <li key={item} className="border-b border-white/10 pb-3">{item}</li>)}</ul></article>)}
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="why-heading">
        <Container size="wide" className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]">
          <div><p className="text-xs uppercase tracking-[0.28em] text-gold">Why Ansari Space Craft</p><Heading id="why-heading" className="mt-4">Continuity where projects usually fragment</Heading></div>
          <div className="grid gap-x-10 sm:grid-cols-2">
            {REASONS.map(([title, copy]) => <article key={title} className="border-b border-gold/20 py-7"><h3 className="text-lg font-medium text-foreground">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{copy}</p></article>)}
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="services-faq-heading" className="border-y border-gold/20 bg-white/[0.015]">
        <Container size="wide" className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
          <div><p className="text-xs uppercase tracking-[0.28em] text-gold">Services FAQ</p><Heading id="services-faq-heading" className="mt-4">Before your project begins</Heading><p className="mt-5 max-w-md leading-7 text-muted">Practical answers about scope, combinations and how to request an estimate.</p></div>
          <ServicesFaq />
        </Container>
      </Section>

      <Section aria-labelledby="services-cta-heading">
        <Container size="wide">
          <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-gold/[0.06] p-8 sm:p-12 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:p-16">
            <div><p className="text-xs uppercase tracking-[0.28em] text-gold">Start a conversation</p><Heading id="services-cta-heading" className="mt-4 max-w-3xl">Not sure where your project should begin?</Heading><p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Share your site, requirements and approximate scope. We’ll help identify the right combination of services for your project.</p></div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-none"><Link href="/contact?subject=Request%20a%20quotation" className={`${buttonVariants({ size: 'lg' })} w-full sm:w-auto`}>Request a quotation</Link><Link href="/contact" className={`${buttonVariants({ size: 'lg', variant: 'outline' })} w-full sm:w-auto`}>Contact us</Link></div>
          </div>
        </Container>
      </Section>

      {cmsOfferings.length > 0 ? <JsonLd data={cmsOfferings.map((offering) => serviceJsonLd(offering))} /> : null}
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url }, { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE.url}/services` }] }} />
    </div>
  );
}
