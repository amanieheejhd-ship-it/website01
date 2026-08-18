'use client';

import { Accordion } from '../interactive/accordion';
import { SERVICES_FAQS } from './services-content';

/** Services FAQ as an exclusive accordion — one answer open at a time (site-wide pattern). */
export function ServicesFaq() {
  return (
    <Accordion
      items={SERVICES_FAQS.map(([question, answer], index) => ({
        id: `services-faq-${index}`,
        header: (
          <span className="flex min-h-20 items-center py-5 text-lg font-medium text-foreground transition-colors duration-200 group-hover/acc:text-gold">
            {question}
          </span>
        ),
        content: <p className="max-w-2xl pb-7 pr-10 text-sm leading-7 text-muted">{answer}</p>,
      }))}
      itemClassName="border-b border-gold/20"
    />
  );
}
