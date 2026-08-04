'use client';
/** Pages list — edit content or publish. Publishing pushes the page live on the public site. */
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminPageListItem } from '@fardeen/types';
import { EmptyState, PageHeader, Spinner, StatusBadge, TBody, TD, TH, THead, TR, Table } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';

export default function PagesListPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: qk.pages, queryFn: adminApi.pages.list });

  const publish = useMutation({
    mutationFn: (slug: string) => adminApi.pages.publish(slug),
    onSuccess: (page) => {
      toast({ tone: 'success', title: 'Page published', description: page.title });
      qc.invalidateQueries({ queryKey: qk.pages });
      qc.invalidateQueries({ queryKey: qk.page(page.slug) });
    },
    onError: (e) => toast({ tone: 'error', title: 'Publish failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const items: AdminPageListItem[] = query.data ?? [];

  return (
    <>
      <PageHeader title="Pages" description="Edit page content and SEO, then publish to the public site." />

      {query.isLoading ? (
        <div className="py-16"><Spinner label="Loading pages…" /></div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load pages" description={query.error instanceof Error ? query.error.message : undefined} />
      ) : items.length === 0 ? (
        <EmptyState title="No pages yet" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Slug</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link href={`/admin/pages/${p.slug}`} className="font-medium text-foreground hover:text-gold">{p.title}</Link>
                </TD>
                <TD className="text-muted">/{p.slug}</TD>
                <TD><StatusBadge status={p.status} /></TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/pages/${p.slug}`} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-white/5">Edit</Link>
                    <button
                      type="button"
                      onClick={() => publish.mutate(p.slug)}
                      disabled={publish.isPending}
                      className="rounded-md border border-gold/40 px-2.5 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
