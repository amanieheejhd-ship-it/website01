'use client';
/** Dashboard — live aggregated counters from the admin BFF (GET /admin/dashboard) as stat tiles. */
import { useQuery } from '@tanstack/react-query';
import type { QuotationStatus } from '@fardeen/types';
import { adminApi, qk } from '../_lib/admin-client';
import { EmptyState, PageHeader, Spinner, StatTile, StatusBadge } from '../_components/ui';

const QUOTE_ORDER: QuotationStatus[] = ['requested', 'reviewing', 'quoted', 'won', 'lost'];

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: qk.dashboard, queryFn: adminApi.dashboard });

  return (
    <>
      <PageHeader title="Dashboard" description="A live snapshot across every bounded context." />

      {isLoading ? (
        <div className="py-16">
          <Spinner label="Loading counters…" />
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load the dashboard" description={error instanceof Error ? error.message : 'Please try again.'} />
      ) : data ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="New enquiries" value={data.contacts.new} hint={`${data.contacts.total} total contacts`} />
            <StatTile
              label="Open quotations"
              value={data.quotations.byStatus.requested + data.quotations.byStatus.reviewing}
              hint={`${data.quotations.total} total requests`}
            />
            <StatTile label="Published projects" value={data.projects.published} hint={`${data.projects.total} total projects`} />
            <StatTile label="Active services" value={data.services.active} hint={`${data.services.total} total services`} />
          </div>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.2em] text-muted">Quotations by status</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {QUOTE_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                  <StatusBadge status={s} />
                  <span className="font-display text-lg text-foreground tabular-nums">{data.quotations.byStatus[s]}</span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-muted">
            Snapshot generated {new Date(data.generatedAt).toLocaleString()} · counters may be briefly cached.
          </p>
        </div>
      ) : null}
    </>
  );
}
