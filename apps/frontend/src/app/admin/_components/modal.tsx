'use client';
/**
 * Accessible modal + confirm dialog for destructive actions (e.g. admin-only project delete).
 * Escape to close, backdrop click to close, focus moved into the panel, body scroll locked, and
 * role="dialog" aria-modal wiring. Built on the ink/gold Surface language.
 */
import * as React from 'react';
import { Button, cn } from '@fardeen/ui';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  labelledBy = 'modal-title',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  labelledBy?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn('relative w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 shadow-2xl outline-none')}
      >
        <h2 id={labelledBy} className="font-display text-xl font-medium text-foreground">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
            destructive
              ? 'bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-500'
              : 'bg-gold text-black hover:bg-gold-light focus-visible:ring-gold',
          )}
        >
          {pending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
