'use client';
/**
 * Shared create/edit project form. Uses the SHARED createProjectSchema (@fardeen/types) as the RHF
 * resolver; gallery ids and metrics are entered as friendly text and mapped to the schema shape on
 * submit. All writes go through the /api/admin proxy → BFF → owning project-service.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectSchema, type CategoryDto } from '@fardeen/types';
import { Button, FormField, Input, Textarea } from '@fardeen/ui';
import { Select, Spinner, Switch } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk, type CreateProjectInput } from '../../_lib/admin-client';

const CURRENT_YEAR = new Date().getFullYear();

function makeDefaults(categories: CategoryDto[]): CreateProjectInput {
  return {
    slug: '',
    title: '',
    summary: '',
    body: '',
    categoryId: categories[0]?.id ?? '',
    location: '',
    year: CURRENT_YEAR,
    coverMediaId: '',
    galleryMediaIds: [],
    status: 'draft',
    featured: false,
    metrics: {},
  };
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProjectForm({
  mode,
  categories,
  projectId,
}: {
  mode: 'create' | 'edit';
  categories: CategoryDto[];
  projectId?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [gallery, setGallery] = React.useState('');
  const [area, setArea] = React.useState('');
  const [duration, setDuration] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: makeDefaults(categories),
  });

  const projectQuery = useQuery({
    queryKey: qk.project(projectId ?? ''),
    queryFn: () => adminApi.projects.get(projectId as string),
    enabled: mode === 'edit' && Boolean(projectId),
  });

  React.useEffect(() => {
    const p = projectQuery.data;
    if (!p) return;
    reset({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      body: p.body,
      categoryId: p.categoryId,
      location: p.location,
      year: p.year,
      coverMediaId: p.coverMediaId ?? '',
      galleryMediaIds: p.galleryMediaIds,
      status: p.status,
      featured: p.featured,
      metrics: {},
    });
    setGallery(p.galleryMediaIds.join('\n'));
    setArea(p.metrics.area ?? '');
    setDuration(p.metrics.durationMonths != null ? String(p.metrics.durationMonths) : '');
  }, [projectQuery.data, reset]);

  const save = useMutation({
    mutationFn: (payload: CreateProjectInput) =>
      mode === 'create' ? adminApi.projects.create(payload) : adminApi.projects.update(projectId as string, payload),
    onSuccess: (proj) => {
      toast({ tone: 'success', title: mode === 'create' ? 'Project created' : 'Project updated', description: proj.title });
      qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      if (projectId) qc.invalidateQueries({ queryKey: qk.project(projectId) });
      router.push('/admin/projects');
    },
    onError: (e) => toast({ tone: 'error', title: 'Save failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const onSubmit = handleSubmit((values) => {
    const trimmedDuration = duration.trim();
    const payload: CreateProjectInput = {
      ...values,
      coverMediaId: values.coverMediaId && values.coverMediaId.trim() ? values.coverMediaId.trim() : null,
      galleryMediaIds: parseLines(gallery),
      metrics: {
        area: area.trim() ? area.trim() : null,
        durationMonths: /^\d+$/.test(trimmedDuration) ? Number(trimmedDuration) : null,
      },
    };
    save.mutate(payload);
  });

  if (mode === 'edit' && projectQuery.isLoading) {
    return <div className="py-16"><Spinner label="Loading project…" /></div>;
  }
  if (mode === 'edit' && projectQuery.isError) {
    return <p className="text-sm text-red-400">Couldn&apos;t load this project. It may have been deleted.</p>;
  }

  const featured = watch('featured');
  const busy = isSubmitting || save.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-8">
      <FieldGroup title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="p-title" label="Title" required error={errors.title?.message}>
            {(f) => <Input {...f} {...register('title')} placeholder="Skyline Villa" />}
          </FormField>
          <FormField htmlFor="p-slug" label="Slug" required error={errors.slug?.message} description="Used in the public URL.">
            {(f) => <Input {...f} {...register('slug')} placeholder="skyline-villa" />}
          </FormField>
          <FormField htmlFor="p-category" label="Category" required error={errors.categoryId?.message}>
            {(f) => (
              <Select {...f} {...register('categoryId')} aria-invalid={Boolean(errors.categoryId)}>
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField htmlFor="p-year" label="Year" required error={errors.year?.message}>
              {(f) => <Input {...f} {...register('year')} type="number" inputMode="numeric" />}
            </FormField>
            <FormField htmlFor="p-location" label="Location" error={errors.location?.message}>
              {(f) => <Input {...f} {...register('location')} placeholder="Mumbai" />}
            </FormField>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Content">
        <FormField htmlFor="p-summary" label="Summary" error={errors.summary?.message} description="One or two sentences shown in listings.">
          {(f) => <Textarea {...f} {...register('summary')} rows={2} />}
        </FormField>
        <FormField htmlFor="p-body" label="Case study" error={errors.body?.message} description="Long-form body (supports HTML).">
          {(f) => <Textarea {...f} {...register('body')} rows={6} />}
        </FormField>
      </FieldGroup>

      <FieldGroup title="Media" description="Enter media ids from the media library.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="p-cover" label="Cover media id" error={errors.coverMediaId?.message}>
            {(f) => <Input {...f} {...register('coverMediaId')} placeholder="med_…" />}
          </FormField>
        </div>
        <FormField htmlFor="p-gallery" label="Gallery media ids" description="One id per line.">
          {(f) => <Textarea id={f.id} value={gallery} onChange={(e) => setGallery(e.target.value)} rows={3} placeholder={'med_a\nmed_b'} />}
        </FormField>
      </FieldGroup>

      <FieldGroup title="Metrics">
        <div className="grid grid-cols-2 gap-4">
          <FormField htmlFor="p-area" label="Area">
            {(f) => <Input id={f.id} value={area} onChange={(e) => setArea(e.target.value)} placeholder="4,200 sq ft" />}
          </FormField>
          <FormField htmlFor="p-duration" label="Duration (months)">
            {(f) => <Input id={f.id} value={duration} onChange={(e) => setDuration(e.target.value)} type="number" inputMode="numeric" placeholder="14" />}
          </FormField>
        </div>
      </FieldGroup>

      <FieldGroup title="Publishing">
        <div className="flex flex-wrap items-center gap-8">
          <FormField htmlFor="p-status" label="Status" error={errors.status?.message} className="w-48">
            {(f) => (
              <Select {...f} {...register('status')} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
            )}
          </FormField>
          <div className="flex items-center gap-3">
            <Switch id="p-featured" checked={featured} onChange={(v) => setValue('featured', v, { shouldDirty: true })} label="Featured" />
            <label htmlFor="p-featured" className="text-sm text-foreground">Featured on the homepage</label>
          </div>
        </div>
      </FieldGroup>

      <div className="flex items-center gap-3 border-t border-white/10 pt-6">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}
        </Button>
        <Link href="/admin/projects" className="text-sm text-muted transition-colors hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-medium text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
