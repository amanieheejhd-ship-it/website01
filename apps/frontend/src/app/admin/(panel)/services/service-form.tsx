'use client';
/**
 * Shared create/edit service form. Flat fields use the SHARED upsertServiceSchema (@fardeen/types)
 * as the RHF resolver; the nested features[] and pricingTiers[] are edited with repeatable rows and
 * the fully-merged payload is re-validated with the same schema before it is sent (POST/PATCH upsert
 * by slug → BFF → owning service-management). No hard delete (deactivate via the `active` flag).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertServiceSchema } from '@fardeen/types';
import { Button, FormField, Input, Textarea, cn } from '@fardeen/ui';
import { Select, Spinner, Switch } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk, type UpsertServiceInput } from '../../_lib/admin-client';

interface FeatureRow { title: string; description: string }
interface TierRow { name: string; priceFrom: string; currency: string; unit: string; inclusions: string }

const formDefaults: UpsertServiceInput = {
  slug: '', name: '', tagline: '', description: '', icon: '', heroMediaId: '', order: 0, active: true, features: [], pricingTiers: [],
};

function parseLines(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

export function ServiceForm({ mode, slug }: { mode: 'create' | 'edit'; slug?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [features, setFeatures] = React.useState<FeatureRow[]>([]);
  const [tiers, setTiers] = React.useState<TierRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpsertServiceInput>({
    resolver: zodResolver(upsertServiceSchema),
    defaultValues: formDefaults,
  });

  // Edit: services have no get-by-slug route, so read the full list (incl inactive) and find it.
  const listQuery = useQuery({ queryKey: qk.services, queryFn: adminApi.services.list, enabled: mode === 'edit' });
  const existing = mode === 'edit' ? listQuery.data?.find((s) => s.slug === slug) : undefined;

  React.useEffect(() => {
    if (!existing) return;
    reset({
      slug: existing.slug,
      name: existing.name,
      tagline: existing.tagline,
      description: existing.description,
      icon: existing.icon,
      heroMediaId: existing.heroMediaId ?? '',
      order: existing.order,
      active: existing.active,
      features: [],
      pricingTiers: [],
    });
    setFeatures(existing.features.map((f) => ({ title: f.title, description: f.description })));
    setTiers(
      existing.pricingTiers.map((t) => ({
        name: t.name,
        priceFrom: String(t.priceFrom),
        currency: t.currency,
        unit: t.unit,
        inclusions: t.inclusions.join('\n'),
      })),
    );
  }, [existing, reset]);

  const save = useMutation({
    mutationFn: (payload: UpsertServiceInput) =>
      mode === 'create' ? adminApi.services.upsert(payload) : adminApi.services.update(slug as string, payload),
    onSuccess: (svc) => {
      toast({ tone: 'success', title: mode === 'create' ? 'Service created' : 'Service updated', description: svc.name });
      qc.invalidateQueries({ queryKey: qk.services });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      router.push('/admin/services');
    },
    onError: (e) => toast({ tone: 'error', title: 'Save failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const onSubmit = handleSubmit((values) => {
    const payload = {
      ...values,
      heroMediaId: values.heroMediaId && values.heroMediaId.trim() ? values.heroMediaId.trim() : null,
      features: features
        .filter((f) => f.title.trim())
        .map((f, i) => ({ title: f.title.trim(), description: f.description.trim(), order: i })),
      pricingTiers: tiers
        .filter((t) => t.name.trim())
        .map((t, i) => ({
          name: t.name.trim(),
          priceFrom: /^\d+$/.test(t.priceFrom.trim()) ? Number(t.priceFrom.trim()) : 0,
          currency: t.currency.trim() || 'INR',
          unit: t.unit.trim(),
          inclusions: parseLines(t.inclusions),
          order: i,
        })),
    };
    const check = upsertServiceSchema.safeParse(payload);
    if (!check.success) {
      toast({ tone: 'error', title: 'Check the form', description: check.error.issues[0]?.message ?? 'Some fields are invalid.' });
      return;
    }
    save.mutate(check.data);
  });

  if (mode === 'edit' && listQuery.isLoading) return <div className="py-16"><Spinner label="Loading service…" /></div>;
  if (mode === 'edit' && !listQuery.isLoading && !existing) return <p className="text-sm text-red-400">This service could not be found.</p>;

  const active = watch('active');

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-8">
      <section className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="s-name" label="Name" required error={errors.name?.message}>
            {(f) => <Input {...f} {...register('name')} placeholder="Architecture & Design" />}
          </FormField>
          <FormField htmlFor="s-slug" label="Slug" required error={errors.slug?.message} description={mode === 'edit' ? 'Changing the slug creates a new record.' : undefined}>
            {(f) => <Input {...f} {...register('slug')} placeholder="architecture-design" />}
          </FormField>
          <FormField htmlFor="s-tagline" label="Tagline" error={errors.tagline?.message}>
            {(f) => <Input {...f} {...register('tagline')} placeholder="Form meets function" />}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField htmlFor="s-icon" label="Icon" error={errors.icon?.message}>
              {(f) => <Input {...f} {...register('icon')} placeholder="compass" />}
            </FormField>
            <FormField htmlFor="s-order" label="Order" error={errors.order?.message}>
              {(f) => <Input {...f} {...register('order')} type="number" inputMode="numeric" />}
            </FormField>
          </div>
        </div>
        <FormField htmlFor="s-description" label="Description" error={errors.description?.message}>
          {(f) => <Textarea {...f} {...register('description')} rows={4} />}
        </FormField>
        <FormField htmlFor="s-hero" label="Hero media id" error={errors.heroMediaId?.message}>
          {(f) => <Input {...f} {...register('heroMediaId')} placeholder="med_…" />}
        </FormField>
        <div className="flex items-center gap-3">
          <Switch id="s-active" checked={active} onChange={(v) => setValue('active', v, { shouldDirty: true })} label="Active" />
          <label htmlFor="s-active" className="text-sm text-foreground">Active (visible on the public site)</label>
        </div>
      </section>

      {/* Features */}
      <RowEditor
        title="Features"
        addLabel="Add feature"
        onAdd={() => setFeatures((prev) => [...prev, { title: '', description: '' }])}
        rows={features}
        onRemove={(i) => setFeatures((prev) => prev.filter((_, idx) => idx !== i))}
        render={(row, i) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Input value={row.title} placeholder="Feature title" onChange={(e) => setFeatures((prev) => prev.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))} />
            <Input value={row.description} placeholder="Short description" onChange={(e) => setFeatures((prev) => prev.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r)))} />
          </div>
        )}
      />

      {/* Pricing tiers */}
      <RowEditor
        title="Pricing tiers"
        addLabel="Add tier"
        onAdd={() => setTiers((prev) => [...prev, { name: '', priceFrom: '', currency: 'INR', unit: '', inclusions: '' }])}
        rows={tiers}
        onRemove={(i) => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
        render={(row, i) => (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Input value={row.name} placeholder="Tier name" onChange={(e) => setTiers((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))} />
              <Input value={row.priceFrom} type="number" inputMode="numeric" placeholder="Price from (paise)" onChange={(e) => setTiers((prev) => prev.map((r, idx) => (idx === i ? { ...r, priceFrom: e.target.value } : r)))} />
              <Input value={row.currency} placeholder="INR" onChange={(e) => setTiers((prev) => prev.map((r, idx) => (idx === i ? { ...r, currency: e.target.value } : r)))} />
              <Input value={row.unit} placeholder="per sq ft" onChange={(e) => setTiers((prev) => prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))} />
            </div>
            <Textarea value={row.inclusions} rows={2} placeholder="One inclusion per line" onChange={(e) => setTiers((prev) => prev.map((r, idx) => (idx === i ? { ...r, inclusions: e.target.value } : r)))} />
          </div>
        )}
      />

      <div className="flex items-center gap-3 border-t border-white/10 pt-6">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create service' : 'Save changes'}
        </Button>
        <Link href="/admin/services" className="text-sm text-muted transition-colors hover:text-foreground">Cancel</Link>
      </div>
    </form>
  );
}

function RowEditor<T>({
  title,
  addLabel,
  rows,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  addLabel: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (row: T, index: number) => React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-foreground">{title}</h2>
        <button type="button" onClick={onAdd} className={cn('rounded-md border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10')}>
          {addLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted">#{i + 1}</span>
                <button type="button" onClick={() => onRemove(i)} className="text-xs text-red-300 transition-colors hover:text-red-200">Remove</button>
              </div>
              {render(row, i)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
