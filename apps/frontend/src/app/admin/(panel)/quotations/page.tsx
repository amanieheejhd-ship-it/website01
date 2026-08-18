'use client';
/** Quotations list — filter by status, change status inline (requested→reviewing→quoted→won/lost),
 *  and open a detail view. */
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuotationStatus } from '@fardeen/types';
import { EmptyState, PageHeader, Pagination, Select, Spinner, StatusBadge, TBody, TD, TH, THead, TR, Table } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';
import { formatMinor } from '../../_lib/money';
import { QUOTE_STATUSES } from './statuses';

const LIMIT = 20;

export default function QuotationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const query = useQuery({
    queryKey: qk.quotations({ status: status || undefined, page, limit: LIMIT }),
    queryFn: () => adminApi.quotations.list({ status: status || undefined, page, limit: LIMIT }),
  });

  const change = useMutation({
    mutationFn: ({ id, next }: { id: string; next: QuotationStatus }) => adminApi.quotations.setStatus(id, next),
    onSuccess: () => {
      toast({ tone: 'success', title: 'Status updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'quotations'] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast({ tone: 'error', title: 'Update failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Requests for quotes from the public site."
        actions={
          <Select
            aria-label="Filter by status"
            value={status}
            className="w-44"
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...QUOTE_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
          />
        }
      />

      {query.isLoading ? (
        <div className="py-16"><Spinner label="Loading quotations…" /></div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load quotations" description={query.error instanceof Error ? query.error.message : undefined} />
      ) : items.length === 0 ? (
        <EmptyState title="No quotation requests" description={status ? 'None with this status.' : 'New requests will appear here.'} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Contact</TH>
                <TH>Project</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((q) => (
                <TR key={q.id}>
                  <TD>
                    <Link href={`/admin/quotations/${q.id}`} className="font-medium text-foreground hover:text-gold">{q.contact.name}</Link>
                    <span className="block text-xs text-muted">{q.contact.email}</span>
                  </TD>
                  <TD className="text-muted">{q.projectType || '—'}</TD>
                  <TD className="tabular-nums text-foreground/90">{q.total > 0 ? formatMinor(q.total) : '—'}</TD>
                  <TD><StatusBadge status={q.status} /></TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/quotations/${q.id}`} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-white/5">View</Link>
                      <Select
                        aria-label={`Set status for ${q.contact.name}`}
                        value={q.status}
                        className="w-36"
                        disabled={change.isPending}
                        onChange={(e) => change.mutate({ id: q.id, next: e.target.value as QuotationStatus })}
                        options={QUOTE_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={query.data?.total ?? 0} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
