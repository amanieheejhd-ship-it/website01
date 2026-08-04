import type { Metadata } from 'next';
import { Container, Prose, Section } from '@fardeen/ui';
import {
  getHomePage,
  getProjects,
  getServices,
  getTestimonials,
  type ContentResponse,
  type ListResponse,
  type PaginatedResponse,
} from '../../lib/api';
import { absoluteUrl, SITE } from '../../lib/site';
import { itemListJsonLd } from '../../lib/seo';
import type { PageDto, ProjectListItemDto, ServiceOfferingDto, TestimonialDto } from '@fardeen/types';
import { CinematicMount } from '../../components/cinematic/cinematic-mount';
import { Hero } from '../../components/sections/hero';
import { ServicesSection } from '../../components/sections/services-section';
import { ProjectsSection } from '../../components/sections/projects-section';
import { TestimonialsSection } from '../../components/sections/testimonials-section';
import { ContactSection } from '../../components/sections/contact-section';
import { JsonLd } from '../../components/seo/json-ld';

// Marketing home content changes rarely; revalidate hourly (ISR) rather than every minute.
export const revalidate = 3600;

/** Degrade gracefully — a single service being down must not blank the whole page. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}
const emptyList = <T,>(): ListResponse<T> => ({ data: [], meta: { requestId: '' } });
const emptyPage = <T,>(): PaginatedResponse<T> => ({
  data: [],
  meta: { requestId: '', page: 1, limit: 0, total: 0 },
});

function sectionPayload<T>(home: ContentResponse<PageDto> | null, type: string): T | undefined {
  return home?.data.sections.find((s) => s.type === type)?.payload as T | undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const home = await safe(getHomePage(), null);
  const seo = home?.data.seo;
  // Always emit a concrete title — never `undefined` (which can drop the <title> entirely if the
  // CMS is briefly unreachable during an ISR revalidation).
  return {
    title: { absolute: seo?.title || 'Fardeen — We build the moment you walk in' },
    description: seo?.description || SITE.description,
    alternates: { canonical: '/' },
  };
}

export default async function HomePage() {
  const [home, services, projects, testimonials] = await Promise.all([
    safe(getHomePage(), null),
    safe(getServices(), emptyList<ServiceOfferingDto>()),
    safe(getProjects({ limit: 6 }), emptyPage<ProjectListItemDto>()),
    safe(getTestimonials(true), emptyList<TestimonialDto>()),
  ]);

  const hero = sectionPayload<{ headline?: string; sub?: string }>(home, 'hero') ?? {};
  const intro = sectionPayload<{ html?: string }>(home, 'richText');

  return (
    <>
      <Hero
        headline={hero.headline ?? SITE.tagline}
        sub={hero.sub ?? 'From empty land to a finished luxury villa — delivered end to end.'}
      />

      {/* Phase 6a: the pinned cinematic journey (Scenes 1–11) mounts here — client-only, gated on
          motion + WebGL, additive. With motion off / no WebGL this renders nothing and the static
          Phase-5 sections below stand in as the complete experience. */}
      <CinematicMount />

      {intro?.html ? (
        <Section spacing="sm" aria-label="Introduction">
          <Container size="wide">
            <Prose html={intro.html} className="max-w-3xl font-display text-xl text-foreground" />
          </Container>
        </Section>
      ) : null}

      <ServicesSection offerings={services.data} limit={6} />
      <ProjectsSection projects={projects.data} included={projects.included} limit={6} />
      <TestimonialsSection testimonials={testimonials.data} included={testimonials.included} />
      <ContactSection />

      {services.data.length > 0 ? (
        <JsonLd
          data={itemListJsonLd(
            'Fardeen services',
            services.data.map((s) => ({ url: absoluteUrl(`/services#${s.slug}`), name: s.name })),
          )}
        />
      ) : null}
    </>
  );
}
