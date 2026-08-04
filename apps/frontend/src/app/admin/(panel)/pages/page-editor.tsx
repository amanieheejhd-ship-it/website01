'use client';
/**
 * Page editor — title, SEO, and ordered sections. Sections carry a freeform typed `payload`
 * (SectionType-specific JSON) edited as JSON text. Uses the SHARED updatePageSchema as the RHF
 * resolver for the scalar fields and re-validates the fully-assembled payload before saving. Publish
 * is a separate action. All writes go through the proxy → BFF → owning cms-service.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updatePageSchema, type SectionType, type UpdatePageInput } from '@fardeen/types';
import { Button, FormField, Input, Textarea, cn } from '@fardeen/ui';
import { Select, Spinner, StatusBadge } from '../../_components/ui';
import { useToast } from '../../_components/toast';
import { ApiError, adminApi, qk } from '../../_lib/admin-client';

const SECTION_TYPES: SectionType[] = ['hero', 'scene', 'richText', 'gallery', 'cta'];

interface SectionRow {
  id?: string;
  type: SectionType;
  payloadText: string;
  mediaRefsText: string;
}

const formDefaults: UpdatePageInput = { title: '', seo: { title: '', description: '', ogImageMediaId: '' }, sections: [] };

function parseLines(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

export function PageEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sections, setSections] = React.useState<SectionRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePageInput>({ resolver: zodResolver(updatePageSchema), defaultValues: formDefaults });

  const query = useQuery({ queryKey: qk.page(slug), queryFn: () => adminApi.pages.get(slug) });

  React.useEffect(() => {
    const p = query.data;
    if (!p) return;
    reset({
      title: p.title,
      seo: { title: p.seo.title, description: p.seo.description, ogImageMediaId: p.seo.ogImageMediaId ?? '' },
      sections: [],
    });
    setSections(
      [...p.sections]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          type: s.type,
          payloadText: JSON.stringify(s.payload ?? {}, null, 2),
          mediaRefsText: s.mediaRefs.join('\n'),
        })),
    );
  }, [query.data, reset]);

  const save = useMutation({
    mutationFn: (payload: UpdatePageInput) => adminApi.pages.update(slug, payload),
    onSuccess: (page) => {
      toast({ tone: 'success', title: 'Page saved', description: page.title });
      qc.invalidateQueries({ queryKey: qk.pages });
      qc.invalidateQueries({ queryKey: qk.page(slug) });
    },
    onError: (e) => toast({ tone: 'error', title: 'Save failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const publish = useMutation({
    mutationFn: () => adminApi.pages.publish(slug),
    onSuccess: (page) => {
      toast({ tone: 'success', title: 'Page published', description: page.title });
      qc.invalidateQueries({ queryKey: qk.pages });
      qc.invalidateQueries({ queryKey: qk.page(slug) });
    },
    onError: (e) => toast({ tone: 'error', title: 'Publish failed', description: e instanceof ApiError ? e.message : 'Please try again.' }),
  });

  const onSubmit = handleSubmit((values) => {
    const built: UpdatePageInput['sections'] = [];
    for (let i = 0; i < sections.length; i += 1) {
      const s = sections[i];
      let payload: unknown = {};
      if (s.payloadText.trim()) {
        try {
          payload = JSON.parse(s.payloadText);
        } catch {
          toast({ tone: 'error', title: `Section ${i + 1} payload is not valid JSON`, description: 'Fix the JSON and try again.' });
          return;
        }
      }
      built.push({ ...(s.id ? { id: s.id } : {}), type: s.type, order: i, payload, mediaRefs: parseLines(s.mediaRefsText) });
    }
    const payload = {
      title: values.title,
      seo: {
        title: values.seo.title,
        description: values.seo.description,
        ogImageMediaId: values.seo.ogImageMediaId && values.seo.ogImageMediaId.trim() ? values.seo.ogImageMediaId.trim() : null,
      },
      sections: built,
    };
    const check = updatePageSchema.safeParse(payload);
    if (!check.success) {
      toast({ tone: 'error', title: 'Check the form', description: check.error.issues[0]?.message ?? 'Some fields are invalid.' });
      return;
    }
    save.mutate(check.data);
  });

  if (query.isLoading) return <div className="py-16"><Spinner label="Loading page…" /></div>;
  if (query.isError || !query.data) return <p className="text-sm text-red-400">This page could not be loaded.</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <StatusBadge status={query.data.status} />
        <span className="text-sm text-muted">/{slug}</span>
      </div>

      <section className="space-y-5">
        <FormField htmlFor="pg-title" label="Title" required error={errors.title?.message}>
          {(f) => <Input {...f} {...register('title')} />}
        </FormField>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-medium text-foreground">SEO</h2>
        <FormField htmlFor="pg-seo-title" label="Meta title" error={errors.seo?.title?.message}>
          {(f) => <Input {...f} {...register('seo.title')} />}
        </FormField>
        <FormField htmlFor="pg-seo-desc" label="Meta description" error={errors.seo?.description?.message}>
          {(f) => <Textarea {...f} {...register('seo.description')} rows={2} />}
        </FormField>
        <FormField htmlFor="pg-seo-og" label="OG image media id" error={errors.seo?.ogImageMediaId?.message}>
          {(f) => <Input {...f} {...register('seo.ogImageMediaId')} placeholder="med_…" />}
        </FormField>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-foreground">Sections</h2>
          <button
            type="button"
            onClick={() => setSections((prev) => [...prev, { type: 'richText', payloadText: '{}', mediaRefsText: '' }])}
            className={cn('rounded-md border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10')}
          >
            Add section
          </button>
        </div>
        {sections.length === 0 ? (
          <p className="text-sm text-muted">No sections.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-muted">#{i + 1}</span>
                    <Select
                      value={s.type}
                      className="h-8 py-1 text-xs"
                      onChange={(e) => setSections((prev) => prev.map((r, idx) => (idx === i ? { ...r, type: e.target.value as SectionType } : r)))}
                      options={SECTION_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </div>
                  <button type="button" onClick={() => setSections((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-300 transition-colors hover:text-red-200">
                    Remove
                  </button>
                </div>
                <label className="mb-1 block text-xs text-muted">Payload (JSON)</label>
                <Textarea
                  value={s.payloadText}
                  rows={4}
                  className="font-mono text-xs"
                  onChange={(e) => setSections((prev) => prev.map((r, idx) => (idx === i ? { ...r, payloadText: e.target.value } : r)))}
                />
                <label className="mb-1 mt-3 block text-xs text-muted">Media refs (one id per line)</label>
                <Textarea
                  value={s.mediaRefsText}
                  rows={2}
                  onChange={(e) => setSections((prev) => prev.map((r, idx) => (idx === i ? { ...r, mediaRefsText: e.target.value } : r)))}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
        <Button type="button" variant="outline" disabled={publish.isPending} onClick={() => publish.mutate()}>
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
        <Link href="/admin/pages" className="text-sm text-muted transition-colors hover:text-foreground">Back</Link>
      </div>
    </form>
  );
}
