'use client';
/** Quotation detail + status lifecycle control. */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuotationStatus } from '@fardeen/types';
import { Badge } from '@fardeen/ui';
import { EmptyState, Select, Spinner, StatusBadge, TBody, TD, TH, THead, TR, Table } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';
import { formatMinor } from '../../_lib/money';
import { QUOTE_STATUSES } from './page';

export function QuotationDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: qk.quotation(id), queryFn: () => adminApi.quotations.get(id) });

  const change = useMutation({
    mutationFn: (next: QuotationStatus) => adminApi.quotations.setStatus(id, next),
    onSuccess: () => {
      toast({ tone: 'success', title: 'Status updated' });
      qc.invalidateQueries({ queryKey: qk.quotation(id) });
      qc.invalidateQueries({ queryKey: ['admin', 'quotations'] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast({ tone: 'error', title: 'Update failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  if (query.isLoading) return <div className="py-16"><Spinner label="Loading quotation…" /></div>;
  if (query.isError || !query.data) return <EmptyState title="Couldn't load this quotation" />;

  const q = query.data;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/quotations" className="text-sm text-muted transition-colors hover:text-foreground">← All quotations</Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-foreground">{q.contact.name}</h1>
          <p className="text-sm text-muted">Requested {new Date(q.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={q.status} />
          <Select
            aria-label="Set status"
            value={q.status}
            className="w-40"
            disabled={change.isPending}
            onChange={(e) => change.mutate(e.target.value as QuotationStatus)}
            options={QUOTE_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Contact">
          <dl className="space-y-1.5 text-sm">
            <Row label="Email" value={<a className="text-gold hover:underline" href={`mailto:${q.contact.email}`}>{q.contact.email}</a>} />
            <Row label="Phone" value={q.contact.phone || '—'} />
          </dl>
        </InfoCard>
        <InfoCard title="Request">
          <dl className="space-y-1.5 text-sm">
            <Row label="Project type" value={q.projectType || '—'} />
            <Row label="Timeline" value={q.timeline || '—'} />
            <Row label="Budget" value={q.budgetRange ? `${formatMinor(q.budgetRange.min, q.budgetRange.currency)} – ${formatMinor(q.budgetRange.max, q.budgetRange.currency)}` : '—'} />
          </dl>
        </InfoCard>
      </div>

      {q.serviceSlugs.length > 0 ? (
        <InfoCard title="Services">
          <div className="flex flex-wrap gap-2">
            {q.serviceSlugs.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </InfoCard>
      ) : null}

      {q.details ? (
        <InfoCard title="Details">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{q.details}</p>
        </InfoCard>
      ) : null}

      {q.lineItems.length > 0 ? (
        <div>
          <h2 className="mb-3 font-display text-lg font-medium text-foreground">Line items</h2>
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Unit</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {q.lineItems.map((li) => (
                <TR key={li.id}>
                  <TD>{li.label}</TD>
                  <TD className="text-right tabular-nums text-muted">{li.qty}</TD>
                  <TD className="text-right tabular-nums text-muted">{formatMinor(li.unitPrice, li.currency)}</TD>
                  <TD className="text-right tabular-nums text-foreground">{formatMinor(li.unitPrice * li.qty, li.currency)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="mt-3 flex justify-end gap-8 text-sm">
            <span className="text-muted">Total</span>
            <span className="font-display text-lg text-foreground tabular-nums">{formatMinor(q.total)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-[0.15em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground/90">{value}</dd>
    </div>
  );
}
