import { Container, Eyebrow, Heading, Lead } from '@fardeen/ui';
import type { ReactNode } from 'react';

/** Top band for interior (non-home) pages — sits under the sticky header. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <Container size="wide" className="py-16 sm:py-20">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading as="h1" size="xl" className="mt-3 text-balance">
          {title}
        </Heading>
        {lead ? <Lead className="mt-4">{lead}</Lead> : null}
        {children}
      </Container>
    </div>
  );
}
