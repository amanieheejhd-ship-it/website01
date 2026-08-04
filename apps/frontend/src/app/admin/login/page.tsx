import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '../_components/login-form';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
