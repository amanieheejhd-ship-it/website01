import type { ProjectListItemDto } from '@fardeen/types';
import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import type { Included } from '../../lib/api';
import { RevealGroup, RevealItem } from '../motion/reveal';
import { ProjectCard } from '../projects/project-card';
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
      className="scroll-mt-20 border-y border-white/5 bg-surface/30"
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
          <p className="mt-12 text-muted">Our portfolio will appear here shortly.</p>
        )}
      </Container>
    </Section>
  );
}
