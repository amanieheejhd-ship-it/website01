'use client';
/**
 * Minimal toast system for admin mutation feedback (success/error), consistent with the envelope's
 * error/success states. Provided once by the admin shell; screens call `useToast().toast(...)`.
 */
import * as React from 'react';
import { cn } from '@fardeen/ui';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastCtx {
  toast: (t: { tone?: ToastTone; title: string; description?: string }) => void;
}

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-white/15 bg-white/[0.06]',
};
const TONE_DOT: Record<ToastTone, string> = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  info: 'bg-gold',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastCtx['toast']>(
    ({ tone = 'info', title, description }) => {
      const id = (idRef.current += 1);
      setItems((prev) => [...prev, { id, tone, title, description }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite" role="region" aria-label="Notifications">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md', TONE_STYLES[t.tone])}
          >
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-muted">{t.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="-mr-1 shrink-0 rounded p-1 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Dismiss"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
