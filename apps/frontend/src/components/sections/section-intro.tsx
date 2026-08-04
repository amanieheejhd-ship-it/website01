import { Eyebrow, Heading, Lead } from '@fardeen/ui';
import type { ReactNode } from 'react';
import { AccentLine } from '../motion/accent-line';
import { RevealGroup, RevealItem } from '../motion/reveal';

/** Eyebrow + heading (+ optional lead) block with a gold accent line and staggered on-scroll
 *  reveal. Motion is additive — it renders the same static markup when motion isn't ready. */
export function SectionIntro({
  eyebrow,
  title,
  lead,
  headingId,
  as = 'h2',
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  headingId?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  children?: ReactNode;
}) {
  return (
    <RevealGroup as="div" className={className} amount={0.4}>
      <AccentLine className="mb-5" />
      {eyebrow ? (
        <RevealItem>
          <Eyebrow>{eyebrow}</Eyebrow>
        </RevealItem>
      ) : null}
      <RevealItem>
        <Heading as={as} id={headingId} className="mt-3 text-balance">
          {title}
        </Heading>
      </RevealItem>
      {lead ? (
        <RevealItem>
          <Lead className="mt-4">{lead}</Lead>
        </RevealItem>
      ) : null}
      {children}
    </RevealGroup>
  );
}
