import type { ProjectListItemDto } from '@fardeen/types';
import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import Image from 'next/image';
import type { Included } from '../../lib/api';
import { RevealGroup, RevealItem } from '../motion/reveal';
import { ProjectCard } from '../projects/project-card';
import { FEATURED_PORTFOLIO } from '../projects/portfolio-data';
import { REFERENCE_PORTFOLIO } from '../projects/reference-portfolio';
import { SectionIntro } from './section-intro';

export function ProjectsSection({
  projects,
  included,
  limit,
}: {
  projects: ProjectListItemDto[];
  included?: Included;
  limit?: number;
}) {
  const shown = limit ? projects.slice(0, limit) : projects;
  return (
    <Section
      id="projects"
      aria-labelledby="projects-heading"
      className="scroll-mt-20"
    >
      <Container size="wide">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionIntro
            eyebrow="Selected work"
            headingId="projects-heading"
            title="Projects that speak for themselves"
            lead="Villas, interiors and commercial fit-outs delivered end to end."
            className="max-w-2xl"
          />
          {limit ? (
            <Link href="/projects" className={buttonVariants({ variant: 'outline' })}>
              All projects
            </Link>
          ) : null}
        </div>
        {shown.length > 0 ? (
          <RevealGroup as="ul" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => (
              <RevealItem as="li" variant="mask" key={p.id}>
                <ProjectCard project={p} included={included} priority={i < 3} />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <RevealGroup as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_PORTFOLIO.slice(0, 6).map((category) => (
              <RevealItem as="li" variant="mask" key={category.slug}>
                <a href={`/projects?category=${category.slug}`} className="group block overflow-hidden rounded-xl border border-white/10 bg-surface transition hover:-translate-y-1 hover:border-gold/40">
                  <div className="relative aspect-[4/3] overflow-hidden"><Image src={REFERENCE_PORTFOLIO[category.slug][0].image} alt={`${category.title} reference inspiration`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /><span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/75">Reference inspiration</span></div>
                  <div className="p-5"><p className="text-xs uppercase tracking-[0.2em] text-gold">{category.number} · {category.navLabel}</p><h3 className="mt-2 font-display text-2xl text-foreground">{category.title}</h3></div>
                </a>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </Container>
    </Section>
  );
}
