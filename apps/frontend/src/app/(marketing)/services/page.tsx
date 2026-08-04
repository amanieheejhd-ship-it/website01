import type { Metadata } from 'next';
import type { ServiceOfferingDto } from '@fardeen/types';
import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { getServices, type ListResponse } from '../../../lib/api';
import { serviceJsonLd } from '../../../lib/seo';
import { SITE } from '../../../lib/site';
import { JsonLd } from '../../../components/seo/json-ld';
import { PageHeader } from '../../../components/layout/page-header';
import { ServiceCard } from '../../../components/services/service-card';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Twelve construction and interior disciplines delivered in-house by Fardeen — home construction, ' +
    'aluminium & glass, ACP cladding, modular kitchens, interiors, steel fabrication and more.',
  alternates: { canonical: '/services' },
};

async function safeServices(): Promise<ListResponse<ServiceOfferingDto>> {
  try {
    return await getServices();
  } catch {
    return { data: [], meta: { requestId: '' } };
  }
}

export default async function ServicesPage() {
  const { data: offerings } = await safeServices();

  return (
    <>
      <PageHeader
        eyebrow="What we do"
        title="Full-solution construction, foundation to finish"
        lead="Every discipline your project needs, delivered by one accountable team — so quality and timelines never fall between vendors."
      />

      <Section aria-labelledby="services-list-heading">
        <Container size="wide">
          <h2 id="services-list-heading" className="sr-only">
            All services
          </h2>
          {offerings.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((o) => (
                <li key={o.id}>
                  <ServiceCard offering={o} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              Our services are being loaded. Please check back shortly or{' '}
              <Link href="/contact" className="text-gold underline">
                get in touch
              </Link>
              .
            </p>
          )}
        </Container>
      </Section>

      <Section spacing="sm" aria-label="Get started">
        <Container size="wide" className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-gold/25 bg-gold/[0.06] p-8">
          <p className="font-display text-2xl text-foreground">
            Not sure which services you need?
          </p>
          <Link href="/contact" className={buttonVariants({ size: 'lg' })}>
            Request a quotation
          </Link>
        </Container>
      </Section>

      {offerings.length > 0 ? (
        <JsonLd data={offerings.map((o) => serviceJsonLd(o))} />
      ) : null}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
            { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE.url}/services` },
          ],
        }}
      />
    </>
  );
}
