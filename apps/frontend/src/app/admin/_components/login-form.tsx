'use client';
/**
 * Admin login. Posts credentials to our own /api/admin/session/login handler (which talks to the
 * gateway and sets httpOnly cookies) — the access token never touches this client. On success we
 * navigate to `?next` (or the dashboard) and refresh so the middleware + server gate re-run.
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema, type LoginDto } from '@fardeen/types';
import { Button, FormField, Input, Surface } from '@fardeen/ui';
import { ApiError } from '../../../lib/api';

function safeNext(raw: string | null): string {
  // Only allow same-site admin paths to avoid open-redirects.
  if (raw && raw.startsWith('/admin') && !raw.startsWith('//')) return raw;
  return '/admin';
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const mutation = useMutation({
    mutationFn: async (values: LoginDto) => {
      const res = await fetch('/api/admin/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
        throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? 'Sign in failed');
      }
      return json as { data: { user: { email: string; role: string } } };
    },
    onSuccess: () => {
      router.replace(next);
      router.refresh();
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.status === 401
        ? 'Incorrect email or password.'
        : mutation.error.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : mutation.error.message
      : mutation.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-medium tracking-wide text-foreground">Ansari Space Craft</span>
          <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold">
            Admin
          </span>
          <p className="mt-3 text-sm text-muted">Sign in to manage the site.</p>
        </div>

        <Surface variant="solid" className="p-6">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <FormField htmlFor="admin-email" label="Email" required error={errors.email?.message}>
              {(field) => (
                <Input {...field} {...register('email')} type="email" autoComplete="username" placeholder="you@fardeen.local" autoFocus />
              )}
            </FormField>

            <FormField htmlFor="admin-password" label="Password" required error={errors.password?.message}>
              {(field) => (
                <Input {...field} {...register('password')} type="password" autoComplete="current-password" placeholder="••••••••" />
              )}
            </FormField>

            {errorMessage ? (
              <p role="alert" className="text-sm font-medium text-red-400">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Surface>
      </div>
    </main>
  );
}
