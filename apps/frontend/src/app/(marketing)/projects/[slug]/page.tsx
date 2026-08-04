import type { Metadata } from 'next';
import { Badge, buttonVariants, Container, Prose, Section } from '@fardeen/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, getProject } from '../../../../lib/api';
import { resolveMediaUrl } from '../../../../lib/media';
import { projectJsonLd } from '../../../../lib/seo';
import { absoluteUrl } from '../../../../lib/site';
import { JsonLd } from '../../../../components/seo/json-ld';
import { MediaImage } from '../../../../components/media/media-image';

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: p } = await getProject(slug);
    return {
      title: p.title,
      description: p.summary,
      alternates: { canonical: `/projects/${p.slug}` },
      openGraph: {
        title: p.title,
        description: p.summary,
        url: absoluteUrl(`/projects/${p.slug}`),
        type: 'article',
      },
    };
  } catch {
    return { title: 'Project' };
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  let project;
  let included;
  try {
    const res = await getProject(slug);
    project = res.data;
    included = res.included;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const cover = resolveMediaUrl(included, project.coverMediaId);
  const gallery = project.galleryMediaIds ?? [];

  return (
    <article>
      <div className="border-b border-white/10 bg-surface/30">
        <Container size="wide" className="py-16 sm:py-20">
          <Link href="/projects" className="text-sm text-muted transition-colors hover:text-foreground">
            ← All projects
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {project.featured ? <Badge variant="gold">Featured</Badge> : null}
            <Badge variant="outline">{project.year}</Badge>
            <Badge variant="solid">{project.location}</Badge>
          </div>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{project.summary}</p>
          {(project.metrics.area || project.metrics.durationMonths) ? (
            <dl className="mt-8 flex flex-wrap gap-10">
              {project.metrics.area ? (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-muted">Area</dt>
                  <dd className="mt-1 font-display text-2xl text-foreground">{project.metrics.area}</dd>
                </div>
              ) : null}
              {project.metrics.durationMonths ? (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-muted">Duration</dt>
                  <dd className="mt-1 font-display text-2xl text-foreground">
                    {project.metrics.durationMonths} months
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </Container>
      </div>

      <Section>
        <Container size="wide" className="space-y-12">
          <MediaImage
            url={cover}
            alt={`${project.title} — cover`}
            label={project.title}
            priority
            className="aspect-[16/9] w-full rounded-xl"
            sizes="(max-width: 1152px) 100vw, 1152px"
          />

          {project.body ? <Prose html={`<p>${project.body}</p>`} className="max-w-2xl" /> : null}

          {gallery.length > 0 ? (
            <section aria-labelledby="gallery-heading">
              <h2 id="gallery-heading" className="mb-6 font-display text-2xl text-foreground">
                Gallery
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((id, i) => (
                  <li key={id}>
                    <MediaImage
                      url={resolveMediaUrl(included, id)}
                      alt={`${project.title} — image ${i + 1}`}
                      label={`${project.title} ${i + 1}`}
                      className="aspect-[4/3] w-full rounded-lg"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gold/25 bg-gold/[0.06] p-8">
            <p className="font-display text-2xl text-foreground">Planning something similar?</p>
            <Link href="/contact" className={buttonVariants({ size: 'lg' })}>
              Request a quotation
            </Link>
          </div>
        </Container>
      </Section>

      <JsonLd data={projectJsonLd(project)} />
    </article>
  );
}
