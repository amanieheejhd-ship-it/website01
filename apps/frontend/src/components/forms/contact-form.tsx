'use client';

import { submitContactSchema, type SubmitContactInput } from '@fardeen/types';
import { Button, FormField, Input, Surface, Textarea } from '@fardeen/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, newIdempotencyKey, submitContact } from '../../lib/api';
import { SuccessReveal } from '../motion/success-reveal';

const DEFAULTS: SubmitContactInput = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  source: 'website',
};

export function ContactForm({ initialSubject = '' }: { initialSubject?: string }) {
  const defaultValues: SubmitContactInput = { ...DEFAULTS, subject: initialSubject };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmitContactInput>({
    resolver: zodResolver(submitContactSchema),
    defaultValues,
  });

  // Stable per-submission key: a retry after an ambiguous failure reuses the SAME key so the
  // gateway dedupes it (no duplicate row). Cleared on success → the next submission gets a fresh key.
  const idempotencyKey = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: SubmitContactInput) => {
      if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
      return submitContact(values, idempotencyKey.current);
    },
    onSuccess: () => {
      idempotencyKey.current = null;
      reset(defaultValues);
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  // Move focus to the confirmation when the form is replaced, so keyboard/SR users aren't dropped to <body>.
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
          <p className="font-display text-2xl text-foreground">Message received.</p>
          <p className="mt-2 text-muted">
            Thank you — our team will be in touch shortly. A copy has been sent to your inbox.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => mutation.reset()}>
            Send another message
          </Button>
        </SuccessReveal>
      </Surface>
    );
  }

  return (
    <Surface variant="glass" className="p-6 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-describedby="contact-form-status" className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="contact-name" label="Name" required error={errors.name?.message}>
            {(field) => (
              <Input {...field} {...register('name')} autoComplete="name" placeholder="Your name" />
            )}
          </FormField>
          <FormField htmlFor="contact-email" label="Email" required error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            )}
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField htmlFor="contact-phone" label="Phone" required error={errors.phone?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                placeholder="+91 …"
              />
            )}
          </FormField>
          <FormField
            htmlFor="contact-subject"
            label="Subject"
            required
            error={errors.subject?.message}
          >
            {(field) => (
              <Input {...field} {...register('subject')} placeholder="How can we help?" />
            )}
          </FormField>
        </div>
        <FormField htmlFor="contact-message" label="Message" required error={errors.message?.message}>
          {(field) => (
            <Textarea
              {...field}
              {...register('message')}
              rows={5}
              placeholder="Tell us about your project…"
            />
          )}
        </FormField>

        <div id="contact-form-status" aria-live="polite">
          {mutation.isError ? (
            <p role="alert" className="text-sm font-medium text-red-400">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Something went wrong. Please try again.'}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? 'Sending…' : 'Send message'}
        </Button>
      </form>
    </Surface>
  );
}
