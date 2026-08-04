'use client';

import {
  requestQuotationSchema,
  type RequestQuotationInput,
  type ServiceOfferingDto,
} from '@fardeen/types';
import { Button, FormField, Input, Surface, Textarea } from '@fardeen/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, getServices, newIdempotencyKey, submitQuotation } from '../../lib/api';
import { SuccessReveal } from '../motion/success-reveal';

/**
 * Form schema composed from the SHARED @fardeen/types contract: reuse the contact +
 * serviceSlugs + projectType + timeline + details validation, but model budget as two
 * optional string inputs (mapped to the nullable budgetRange on submit).
 */
const quotationFormSchema = requestQuotationSchema
  .omit({ budgetRange: true, attachments: true })
  .extend({
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const min = v.budgetMin?.trim() ?? '';
    const max = v.budgetMax?.trim() ?? '';
    if (!min && !max) return; // both blank → budget omitted (null)
    if (!!min !== !!max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [min ? 'budgetMax' : 'budgetMin'],
        message: 'Enter both a minimum and maximum budget, or leave both blank.',
      });
      return;
    }
    const isInt = (s: string) => /^\d+$/.test(s);
    if (!isInt(min))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMin'],
        message: 'Enter a whole number in ₹ (no commas or letters).',
      });
    if (!isInt(max))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMax'],
        message: 'Enter a whole number in ₹ (no commas or letters).',
      });
    if (isInt(min) && isInt(max) && Number(min) > Number(max))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMax'],
        message: 'Maximum budget must be at least the minimum.',
      });
  });
type QuotationFormValues = z.infer<typeof quotationFormSchema>;

const DEFAULTS: QuotationFormValues = {
  contact: { name: '', email: '', phone: '' },
  serviceSlugs: [],
  projectType: '',
  timeline: '',
  details: '',
  budgetMin: '',
  budgetMax: '',
};

export function QuotationForm({ initialServices }: { initialServices?: ServiceOfferingDto[] }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: DEFAULTS,
  });

  // `initialData` seeds the query from the server-fetched list so the checkboxes are present in
  // the SSR HTML (readable without JS), while still allowing a client refetch.
  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    initialData: initialServices
      ? { data: initialServices, meta: { requestId: '' } }
      : undefined,
  });
  const services = servicesQuery.data?.data ?? [];

  const idempotencyKey = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: RequestQuotationInput) => {
      if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
      return submitQuotation(input, idempotencyKey.current);
    },
    onSuccess: () => {
      idempotencyKey.current = null;
      reset(DEFAULTS);
    },
  });

  const onSubmit = handleSubmit(({ budgetMin, budgetMax, ...rest }) => {
    // Validation guarantees both-present-numeric or both-blank.
    const min = budgetMin?.trim();
    const max = budgetMax?.trim();
    const budgetRange = min && max ? { min: Number(min), max: Number(max), currency: 'INR' } : null;
    mutation.mutate({ ...rest, budgetRange, attachments: [] });
  });

  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mutation.isSuccess) successRef.current?.focus();
  }, [mutation.isSuccess]);

  if (mutation.isSuccess) {
    return (
      <Surface
        ref={successRef}
        tabIndex={-1}
        variant="gold"
        className="p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <SuccessReveal>
          <p className="font-display text-2xl text-foreground">Quotation request received.</p>
          <p className="mt-2 text-muted">
            We'll review the scope and get back to you with a tailored estimate.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => mutation.reset()}>
            Request another quotation
          </Button>
        </SuccessReveal>
      </Surface>
    );
  }

  return (
    <Surface variant="glass" className="p-6 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-describedby="quote-form-status" className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="quote-name" label="Name" required error={errors.contact?.name?.message}>
            {(field) => (
              <Input {...field} {...register('contact.name')} autoComplete="name" placeholder="Your name" />
            )}
          </FormField>
          <FormField
            htmlFor="quote-email"
            label="Email"
            required
            error={errors.contact?.email?.message}
          >
            {(field) => (
              <Input
                {...field}
                {...register('contact.email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            )}
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            htmlFor="quote-phone"
            label="Phone"
            required
            error={errors.contact?.phone?.message}
          >
            {(field) => (
              <Input {...field} {...register('contact.phone')} type="tel" autoComplete="tel" placeholder="+91 …" />
            )}
          </FormField>
          <FormField
            htmlFor="quote-projectType"
            label="Project type"
            description="e.g. New villa, Office fit-out"
            error={errors.projectType?.message}
          >
            {(field) => (
              <Input {...field} {...register('projectType')} placeholder="New villa" />
            )}
          </FormField>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">Services you're interested in</legend>
          {servicesQuery.isLoading ? (
            <p className="text-sm text-muted">Loading services…</p>
          ) : services.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-muted transition-colors hover:border-gold/40 hover:text-foreground"
                >
                  <input
                    type="checkbox"
                    value={s.slug}
                    {...register('serviceSlugs')}
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-gold accent-gold focus-visible:ring-2 focus-visible:ring-gold"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Service list unavailable — describe your needs below.</p>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField htmlFor="quote-budgetMin" label="Budget from (₹)" error={errors.budgetMin?.message}>
            {(field) => (
              <Input {...field} {...register('budgetMin')} inputMode="numeric" placeholder="500000" />
            )}
          </FormField>
          <FormField htmlFor="quote-budgetMax" label="Budget to (₹)" error={errors.budgetMax?.message}>
            {(field) => (
              <Input {...field} {...register('budgetMax')} inputMode="numeric" placeholder="800000" />
            )}
          </FormField>
          <FormField htmlFor="quote-timeline" label="Timeline" error={errors.timeline?.message}>
            {(field) => (
              <Input {...field} {...register('timeline')} placeholder="9–12 months" />
            )}
          </FormField>
        </div>

        <FormField
          htmlFor="quote-details"
          label="Project details"
          error={errors.details?.message}
        >
          {(field) => (
            <Textarea
              {...field}
              {...register('details')}
              rows={5}
              placeholder="Tell us about the scope, site, and any specifics…"
            />
          )}
        </FormField>

        <div id="quote-form-status" aria-live="polite">
          {mutation.isError ? (
            <p role="alert" className="text-sm font-medium text-red-400">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Something went wrong. Please try again.'}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? 'Submitting…' : 'Request quotation'}
        </Button>
      </form>
    </Surface>
  );
}
