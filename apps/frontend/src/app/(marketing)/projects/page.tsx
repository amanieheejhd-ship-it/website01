import type { Metadata } from 'next';
import type { CategoryDto, ProjectListItemDto } from '@fardeen/types';
import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { getCategories, getProject, getProjects, type ListResponse, type PaginatedResponse } from '../../../lib/api';
import { resolveMediaUrl } from '../../../lib/media';
import { PageHeader } from '../../../components/layout/page-header';
import { PORTFOLIO_CATEGORIES } from '../../../components/projects/portfolio-data';
import { CaseStudyBrowser } from '../../../components/projects/case-study-browser';
import type { RealCaseStudy } from '../../../components/projects/real-project-card';
import styles from './projects-page.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Real Project Case Studies | Ansari Space Craft',
  description: 'Verified Ansari Space Craft project case studies organised by construction, interiors, kitchens, aluminium, glass, fabrication and specialist works.',
  alternates: { canonical: '/projects' },
};

const emptyProjects: PaginatedResponse<ProjectListItemDto> = { data: [], meta: { requestId: '', page: 1, limit: 50, total: 0 } };
const emptyCategories: ListResponse<CategoryDto> = { data: [], meta: { requestId: '' } };

async function safe<T>(request: Promise<T>, fallback: T): Promise<T> {
  try { return await request; } catch { return fallback; }
}

const keywordMap: Record<string, string[]> = {
  construction: ['construction', 'turnkey', 'home'], interiors: ['interior'], kitchens: ['kitchen', 'furniture'],
  aluminium: ['aluminium', 'aluminum'], glass: ['glass', 'glazing'], acp: ['acp', 'facade', 'cladding'],
  steel: ['steel', 'fabrication'], metalwork: ['metal', 'railing', 'gate'], ceilings: ['ceiling', 'gypsum'],
  finishes: ['flooring', 'finish', 'painting'], renovation: ['renovation', 'remodelling', 'remodeling'], commercial: ['commercial', 'office', 'fit-out', 'fitout'],
};

function belongsTo(category: PortfolioCategoryLike, cmsCategory: CategoryDto | undefined) {
  if (!cmsCategory) return false;
  const haystack = `${cmsCategory.slug} ${cmsCategory.name}`.toLowerCase();
  return keywordMap[category.slug]?.some((keyword) => haystack.includes(keyword)) ?? false;
}

type PortfolioCategoryLike = (typeof PORTFOLIO_CATEGORIES)[number];

export default async function ProjectsPage() {
  const [projectsRes, categoriesRes] = await Promise.all([
    safe(getProjects({ page: 1, limit: 50 }), emptyProjects),
    safe(getCategories(), emptyCategories),
  ]);
  const categoryById = new Map(categoriesRes.data.map((category) => [category.id, category]));
  const caseStudies: RealCaseStudy[] = await Promise.all(projectsRes.data.map(async (project) => {
    const detail = await safe(getProject(project.slug), null);
    const data = detail?.data ?? project;
    const included = detail?.included ?? projectsRes.included;
    const galleryMediaIds = 'galleryMediaIds' in data && Array.isArray(data.galleryMediaIds) ? data.galleryMediaIds : [];
    const mediaIds = [data.coverMediaId, ...galleryMediaIds];
    const images = Array.from(new Set(mediaIds.map((id) => resolveMediaUrl(included, id)).filter((url): url is string => Boolean(url))));
    return { id: data.id, slug: data.slug, title: data.title, location: data.location, summary: data.summary, year: data.year || null, categoryId: data.categoryId, images };
  }));
  const projectsByCategory = Object.fromEntries(PORTFOLIO_CATEGORIES.map((category) => [category.slug, caseStudies.filter((project) => belongsTo(category, categoryById.get(project.categoryId)))]));

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Portfolio" title="Our projects" lead="Explore construction, interior, fabrication and specialist-work capabilities by discipline. Reference inspiration is clearly labelled; verified case studies appear when published." />

      <Section spacing="sm" aria-label="Category portfolio">
        <Container size="wide"><CaseStudyBrowser categories={PORTFOLIO_CATEGORIES} projectsByCategory={projectsByCategory} /></Container>
      </Section>

      <Section>
        <Container size="wide">
          <div className="flex flex-col justify-between gap-8 rounded-2xl border border-gold/30 bg-gold/[0.06] p-8 sm:p-12 lg:flex-row lg:items-center">
            <div><p className="text-xs uppercase tracking-[0.24em] text-gold">Have a project in mind?</p><h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">Tell us what you’re planning.</h2></div>
            <Link href="/contact?subject=Start%20a%20project" className={buttonVariants({ size: 'lg' })}>Start your project</Link>
          </div>
        </Container>
      </Section>
    </div>
  );
}
