'use client';

import { Button, Container, Eyebrow, Heading, Lead, Section } from '@fardeen/ui';
import Link from 'next/link';
import { useEffect } from 'react';

/** Marketing-group error boundary — keeps the site shell instead of Next's bare default. */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section spacing="lg">
      <Container size="wide" className="text-center">
        <Eyebrow>Something went wrong</Eyebrow>
        <Heading as="h1" size="xl" className="mt-3">
          We hit a snag loading this page.
        </Heading>
        <Lead className="mx-auto mt-4">
          Please try again — if it keeps happening, get in touch and we'll help.
        </Lead>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className="inline-flex items-center text-gold hover:text-gold-light">
            Back home
          </Link>
        </div>
      </Container>
    </Section>
  );
}
