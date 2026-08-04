'use client';
/** Projects list (includes drafts). Publish toggle + edit for all; delete is admin-only (and the
 *  gateway enforces that regardless of what the UI shows). */
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, ProjectListItemDto } from '@fardeen/types';
import { Button, buttonVariants } from '@fardeen/ui';
import {
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '../../_components/ui';
import { ConfirmDialog } from '../../_components/modal';
import { useToast } from '../../_components/toast';
import { useIsAdmin } from '../../_components/session-context';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';

const LIMIT = 20;

export function ProjectsTable({ categories }: { categories: CategoryDto[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  const [page, setPage] = React.useState(1);
  const [toDelete, setToDelete] = React.useState<ProjectListItemDto | null>(null);

  const categoryName = React.useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  const query = useQuery({ queryKey: qk.projects({ page, limit: LIMIT }), queryFn: () => adminApi.projects.list({ page, limit: LIMIT }) });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };

  const publishToggle = useMutation({
    mutationFn: (p: ProjectListItemDto) => adminApi.projects.update(p.id, { status: p.status === 'published' ? 'draft' : 'published' }),
    onSuccess: (p) => {
      toast({ tone: 'success', title: p.status === 'published' ? 'Published' : 'Moved to draft', description: p.title });
      invalidate();
    },
    onError: (e) => toast({ tone: 'error', title: 'Update failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.projects.remove(id),
    onSuccess: () => {
      toast({ tone: 'success', title: 'Project deleted' });
      setToDelete(null);
      invalidate();
    },
    onError: (e) => {
      setToDelete(null);
      toast({ tone: 'error', title: 'Delete failed', description: e instanceof ApiError ? (e.status === 403 ? 'Only admins can delete projects.' : e.message) : 'Please try again.' });
    },
  });

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project, including drafts. Changes reflect on the public site."
        actions={
          <Link href="/admin/projects/new" className={buttonVariants({ size: 'sm' })}>
            New project
          </Link>
        }
      />

      {query.isLoading ? (
        <div className="py-16"><Spinner label="Loading projects…" /></div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load projects" description={query.error instanceof Error ? query.error.message : undefined} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to see it on the public site."
          action={<Link href="/admin/projects/new" className={buttonVariants({ size: 'sm' })}>New project</Link>}
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Category</TH>
                <TH>Year</TH>
                <TH>Status</TH>
                <TH>Featured</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-foreground hover:text-gold">
                      {p.title}
                    </Link>
                    <span className="block text-xs text-muted">/{p.slug}</span>
                  </TD>
                  <TD className="text-muted">{categoryName(p.categoryId)}</TD>
                  <TD className="tabular-nums text-muted">{p.year}</TD>
                  <TD><StatusBadge status={p.status} /></TD>
                  <TD>{p.featured ? <span className="text-gold">★</span> : <span className="text-muted">—</span>}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => publishToggle.mutate(p)}
                        disabled={publishToggle.isPending}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        {p.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <Link href={`/admin/projects/${p.id}`} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-white/5">
                        Edit
                      </Link>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setToDelete(p)}
                          className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={query.data?.total ?? 0} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        title="Delete project?"
        description={toDelete ? `"${toDelete.title}" will be permanently removed and disappear from the public site.` : undefined}
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
      />
    </>
  );
}
