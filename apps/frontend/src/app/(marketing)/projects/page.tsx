import type { Metadata } from 'next';
import type { CategoryDto, ProjectListItemDto } from '@fardeen/types';
import { Container, Section } from '@fardeen/ui';
import { redirect } from 'next/navigation';
import {
  getCategories,
  getProjects,
  type ListResponse,
  type PaginatedResponse,
} from '../../../lib/api';
import { absoluteUrl } from '../../../lib/site';
import { itemListJsonLd } from '../../../lib/seo';
import { JsonLd } from '../../../components/seo/json-ld';
import { PageHeader } from '../../../components/layout/page-header';
import { CategoryFilter } from '../../../components/projects/category-filter';
import { Pagination } from '../../../components/projects/pagination';
import { ProjectCard } from '../../../components/projects/project-card';

export const revalidate = 60;
const LIMIT = 9;

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Selected work from Fardeen — villas, interiors and commercial fit-outs delivered end to end across India.',
  alternates: { canonical: '/projects' },
};

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const category = typeof sp.category === 'string' ? sp.category : undefined;
  const page = Math.max(1, Number(typeof sp.page === 'string' ? sp.page : '1') || 1);

  const emptyProjects: PaginatedResponse<ProjectListItemDto> = {
    data: [],
    meta: { requestId: '', page, limit: LIMIT, total: 0 },
  };
  const emptyCategories: ListResponse<CategoryDto> = { data: [], meta: { requestId: '' } };

  const [projectsRes, categoriesRes] = await Promise.all([
    safe(getProjects({ category, page, limit: LIMIT }), emptyProjects),
    safe(getCategories(), emptyCategories),
  ]);

  const { data: projects, meta } = projectsRes;

  // Clamp the upper bound: an out-of-range ?page= would otherwise render a self-contradicting
  // dead-end ("6 projects" + "No projects found" + no pagination controls). Send it to the last page.
  const totalPages = Math.max(1, Math.ceil(meta.total / LIMIT));
  if (meta.total > 0 && page > totalPages) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (totalPages > 1) params.set('page', String(totalPages));
    const qs = params.toString();
    redirect(qs ? `/projects?${qs}` : '/projects');
  }

  const activeCategoryName = categoriesRes.data.find((c) => c.slug === category)?.name;

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Our projects"
        lead="A cross-section of what full-solution delivery looks like — filter by category to explore."
      />

      <Section>
        <Container size="wide">
          <div className="flex flex-col gap-6">
            <CategoryFilter categories={categoriesRes.data} active={category} />
            <p className="text-sm text-muted" aria-live="polite">
              {meta.total} {meta.total === 1 ? 'project' : 'projects'}
              {activeCategoryName ? ` in ${activeCategoryName}` : ''}
            </p>
          </div>

          <h2 className="sr-only">Project results</h2>
          {projects.length > 0 ? (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <li key={p.id}>
                  <ProjectCard project={p} included={projectsRes.included} priority={i < 3} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-muted">
              No projects found{activeCategoryName ? ` in ${activeCategoryName}` : ''}. Try another
              category.
            </p>
          )}

          <div className="mt-12">
            <Pagination page={meta.page} total={meta.total} limit={meta.limit} category={category} />
          </div>
        </Container>
      </Section>

      {projects.length > 0 ? (
        <JsonLd
          data={itemListJsonLd(
            'Fardeen projects',
            projects.map((p) => ({ url: absoluteUrl(`/projects/${p.slug}`), name: p.title })),
          )}
        />
      ) : null}
    </>
  );
}
