import type { ServiceOfferingDto } from '@fardeen/types';
import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { RevealGroup, RevealItem } from '../motion/reveal';
import { TiltCard } from '../motion/tilt-card';
import { ServiceCard } from '../services/service-card';
import { SectionIntro } from './section-intro';

export function ServicesSection({
  offerings,
  limit,
}: {
  offerings: ServiceOfferingDto[];
  limit?: number;
}) {
  const shown = limit ? offerings.slice(0, limit) : offerings;
  return (
    <Section id="services" aria-labelledby="services-heading" className="scroll-mt-20">
      <Container size="wide">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionIntro
            eyebrow="What we do"
            headingId="services-heading"
            title="Twelve trades, one accountable team"
            lead="From foundation to finish — every discipline delivered in-house, so nothing falls between the cracks."
            className="max-w-2xl"
          />
          {limit ? (
            <Link href="/services" className={buttonVariants({ variant: 'outline' })}>
              All services
            </Link>
          ) : null}
        </div>
        {shown.length > 0 ? (
          <RevealGroup as="ul" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((o) => (
              <RevealItem as="li" key={o.id}>
                <TiltCard className="h-full">
                  <ServiceCard offering={o} />
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <p className="mt-12 text-muted">Our services will be listed here shortly.</p>
        )}
      </Container>
    </Section>
  );
}
