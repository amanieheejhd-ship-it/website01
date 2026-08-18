'use client';

import { useState, type ReactNode } from 'react';

/**
 * Site-wide EXCLUSIVE accordion: exactly one panel of a group may be open at a time. Opening an
 * item closes the previous one; clicking the open item closes it. Panels animate with the CSS
 * grid-rows technique (grid-template-rows 0fr→1fr + opacity, ~300ms) — no height measurement, no
 * layout thrash; the global reduced-motion CSS collapses the transition to 0s automatically.
 *
 * Accessibility: each header is a real <button> with aria-expanded/aria-controls; each panel is a
 * labelled region. Enter/Space work natively; focus styling comes from the global focus ring.
 *
 * Can be uncontrolled (internal state) or controlled via `openId` + `onOpenChange` for groups that
 * are also driven from elsewhere (e.g. the services discipline index).
 */

export interface AccordionItem {
  id: string;
  /** Header content (rendered inside the toggle button, next to the +/× marker). */
  header: ReactNode;
  /** Panel content revealed when the item is open. */
  content: ReactNode;
}

export function Accordion({
  items,
  openId: controlledOpenId,
  onOpenChange,
  defaultOpenId = null,
  className = '',
  itemClassName = '',
  buttonClassName = '',
  panelClassName = '',
}: {
  items: AccordionItem[];
  openId?: string | null;
  onOpenChange?: (id: string | null) => void;
  defaultOpenId?: string | null;
  className?: string;
  itemClassName?: string;
  buttonClassName?: string;
  panelClassName?: string;
}) {
  const [uncontrolledOpenId, setUncontrolledOpenId] = useState<string | null>(defaultOpenId);
  const openId = controlledOpenId !== undefined ? controlledOpenId : uncontrolledOpenId;

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    if (onOpenChange) onOpenChange(next);
    if (controlledOpenId === undefined) setUncontrolledOpenId(next);
  };

  return (
    <div className={className}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className={itemClassName} data-accordion-item data-open={open || undefined}>
            <button
              type="button"
              id={`${item.id}-toggle`}
              aria-expanded={open}
              aria-controls={`${item.id}-panel`}
              onClick={() => toggle(item.id)}
              className={`group/acc flex w-full items-center justify-between gap-5 text-left ${buttonClassName}`}
            >
              {item.header}
              <span
                aria-hidden="true"
                className={`shrink-0 text-2xl font-light transition-transform duration-300 ${
                  open ? 'rotate-45 text-gold' : 'text-gold/70'
                }`}
              >
                +
              </span>
            </button>
            <div
              id={`${item.id}-panel`}
              role="region"
              aria-labelledby={`${item.id}-toggle`}
              className="grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out"
              // visibility is discretely animatable: it flips only when the close transition ends,
              // and while closed it removes the panel from the tab order + accessibility tree.
              style={{
                gridTemplateRows: open ? '1fr' : '0fr',
                opacity: open ? 1 : 0,
                visibility: open ? 'visible' : 'hidden',
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <div className={panelClassName}>{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
