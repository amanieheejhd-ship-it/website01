'use client';
/** Exposes the server-verified admin identity to client screens (e.g. to gate admin-only UI).
 *  This is UX only — destructive/admin-only actions are always RBAC-enforced by the gateway. */
import * as React from 'react';
import type { Role } from '@fardeen/types';

export interface AdminSession {
  email: string;
  role: Role;
}

const Ctx = React.createContext<AdminSession | null>(null);

export function AdminSessionProvider({ value, children }: { value: AdminSession; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminSession(): AdminSession {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useAdminSession must be used within <AdminSessionProvider>');
  return ctx;
}

export function useIsAdmin(): boolean {
  return useAdminSession().role === 'admin';
}
