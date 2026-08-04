import type { ProjectListItemDto } from '@fardeen/types';
import { Badge } from '@fardeen/ui';
import Link from 'next/link';
import type { Included } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { MediaImage } from '../media/media-image';

export function ProjectCard({
  project,
  included,
  priority,
}: {
  project: ProjectListItemDto;
  included?: Included;
  priority?: boolean;
}) {
  const cover = resolveMediaUrl(included, project.coverMediaId);
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block overflow-hidden rounded-xl border border-white/10 bg-surface transition-colors hover:border-gold/40"
    >
      <MediaImage
        url={cover}
        alt={`${project.title} — ${project.location}`}
        label={project.title}
        priority={priority}
        className="aspect-[4/3] w-full"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="space-y-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {project.featured ? <Badge variant="gold">Featured</Badge> : null}
          <Badge variant="outline">{project.year}</Badge>
        </div>
        <h3 className="font-display text-xl font-medium text-foreground transition-colors group-hover:text-gold">
          {project.title}
        </h3>
        <p className="text-sm text-muted">{project.location}</p>
      </div>
    </Link>
  );
}
