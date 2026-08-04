'use client';
/** Services list (includes inactive). Activate/deactivate inline via the `active` flag — the toggle
 *  re-sends the full record (upsert replaces) so content is never lost. No hard delete. */
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceOfferingDto } from '@fardeen/types';
import { buttonVariants } from '@fardeen/ui';
import { EmptyState, PageHeader, Spinner, StatusBadge, Switch, TBody, TD, TH, THead, TR, Table } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk, type UpsertServiceInput } from '../../_lib/admin-client';

function toUpsertInput(dto: ServiceOfferingDto): UpsertServiceInput {
  return {
    slug: dto.slug,
    name: dto.name,
    tagline: dto.tagline,
    description: dto.description,
    icon: dto.icon,
    heroMediaId: dto.heroMediaId,
    order: dto.order,
    active: dto.active,
    features: dto.features.map((f) => ({ title: f.title, description: f.description, order: f.order })),
    pricingTiers: dto.pricingTiers.map((t) => ({ name: t.name, priceFrom: t.priceFrom, currency: t.currency, unit: t.unit, inclusions: t.inclusions })),
  };
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: qk.services, queryFn: adminApi.services.list });

  const toggle = useMutation({
    mutationFn: (svc: ServiceOfferingDto) => adminApi.services.update(svc.slug, { ...toUpsertInput(svc), active: !svc.active }),
    onSuccess: (svc) => {
      toast({ tone: 'success', title: svc.active ? 'Service activated' : 'Service deactivated', description: svc.name });
      qc.invalidateQueries({ queryKey: qk.services });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast({ tone: 'error', title: 'Update failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const items = [...(query.data ?? [])].sort((a, b) => a.order - b.order);

  return (
    <>
      <PageHeader
        title="Services"
        description="Every service offering, including inactive ones."
        actions={<Link href="/admin/services/new" className={buttonVariants({ size: 'sm' })}>New service</Link>}
      />

      {query.isLoading ? (
        <div className="py-16"><Spinner label="Loading services…" /></div>
      ) : query.isError ? (
        <EmptyState title="Couldn't load services" description={query.error instanceof Error ? query.error.message : undefined} />
      ) : items.length === 0 ? (
        <EmptyState title="No services yet" action={<Link href="/admin/services/new" className={buttonVariants({ size: 'sm' })}>New service</Link>} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Order</TH>
              <TH>State</TH>
              <TH className="text-right">Active</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Link href={`/admin/services/${s.slug}`} className="font-medium text-foreground hover:text-gold">{s.name}</Link>
                  <span className="block text-xs text-muted">{s.tagline}</span>
                </TD>
                <TD className="text-muted">/{s.slug}</TD>
                <TD className="tabular-nums text-muted">{s.order}</TD>
                <TD><StatusBadge status={s.active ? 'active' : 'inactive'} /></TD>
                <TD>
                  <div className="flex justify-end">
                    <Switch checked={s.active} disabled={toggle.isPending} onChange={() => toggle.mutate(s)} label={`Toggle ${s.name}`} />
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
