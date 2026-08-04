'use client';
/** Contacts triage — filter by status and change status inline (new → read → archived). */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContactStatus } from '@fardeen/types';
import { EmptyState, PageHeader, Pagination, Select, Spinner, StatusBadge, TBody, TD, TH, THead, TR, Table } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';

const LIMIT = 20;
const STATUSES: ContactStatus[] = ['new', 'read', 'archived'];

export default function ContactsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const query = useQuery({
    queryKey: qk.contacts({ status: status || undefined, page, limit: LIMIT }),
    queryFn: () => adminApi.contacts.list({ status: status || undefined, page, limit: LIMIT }),
  });

  const change = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ContactStatus }) => adminApi.contacts.setStatus(id, next),
    onSuccess: () => {
      toast({ tone: 'success', title: 'Status updated' });
      qc.invalidateQueries({ queryKey: ['admin', 'contacts'] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast({ tone: 'error', title: 'Update failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Enquiries from the public contact form."
        actions={
          <Select
            aria-label="Filter by status"
            value={status}
            className="w-44"
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
          />
        }
      />

      {query.isLoading ? (
        <div className="py-16"><Spinner label="Loading contacts…" /></div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load contacts" description={query.error instanceof Error ? query.error.message : undefined} />
      ) : items.length === 0 ? (
        <EmptyState title="No enquiries" description={status ? 'No contacts with this status.' : 'New enquiries will appear here.'} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>From</TH>
                <TH>Subject</TH>
                <TH>Received</TH>
                <TH>Status</TH>
                <TH className="text-right">Set status</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <span className="block font-medium text-foreground">{c.name}</span>
                    <a href={`mailto:${c.email}`} className="text-xs text-muted hover:text-gold">{c.email}</a>
                  </TD>
                  <TD className="max-w-xs">
                    <span className="block truncate text-foreground/90">{c.subject || '—'}</span>
                    <span className="block truncate text-xs text-muted">{c.message}</span>
                  </TD>
                  <TD className="whitespace-nowrap text-muted">{new Date(c.createdAt).toLocaleDateString()}</TD>
                  <TD><StatusBadge status={c.status} /></TD>
                  <TD>
                    <div className="flex justify-end">
                      <Select
                        aria-label={`Set status for ${c.name}`}
                        value={c.status}
                        className="w-36"
                        disabled={change.isPending}
                        onChange={(e) => change.mutate({ id: c.id, next: e.target.value as ContactStatus })}
                        options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
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
