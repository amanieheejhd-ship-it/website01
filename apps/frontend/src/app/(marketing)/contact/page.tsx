import type { Metadata } from 'next';
import { Container, Section } from '@fardeen/ui';
import { PageHeader } from '../../../components/layout/page-header';
import { SectionIntro } from '../../../components/sections/section-intro';
import { ContactForm } from '../../../components/forms/contact-form';
import { QuotationForm } from '../../../components/forms/quotation-form';
import { getServices } from '../../../lib/api';
import { SITE } from '../../../lib/site';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Contact & Quotation',
  description:
    'Get in touch with Ansari Space Craft or request a detailed, tailored quotation for your construction or interior project.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  // Server-fetch the service list so the quotation multiselect is present in the SSR HTML.
  const services = await getServices().catch(() => ({ data: [] }));
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Let's build something remarkable"
        lead="Send us a message for a quick reply, or request a detailed quotation with your scope and budget."
      >
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
          <a href={`mailto:${SITE.email}`} className="hover:text-foreground">
            {SITE.email}
          </a>
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="hover:text-foreground">
            {SITE.phone}
          </a>
          <span>{SITE.locality}</span>
        </div>
      </PageHeader>

      <Section aria-labelledby="contact-form-heading">
        <Container size="wide" className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionIntro
            eyebrow="Message us"
            headingId="contact-form-heading"
            title="Send a quick message"
            lead="For general enquiries and callbacks. We usually reply within one business day."
          />
          <ContactForm />
        </Container>
      </Section>

      <Section aria-labelledby="quote-form-heading" className="border-t border-white/5 bg-surface/30">
        <Container size="wide" className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionIntro
            eyebrow="Request a quotation"
            headingId="quote-form-heading"
            title="Get a tailored estimate"
            lead="Pick the services you need, share your budget and timeline, and we'll prepare a detailed quotation."
          />
          <QuotationForm initialServices={services.data} />
        </Container>
      </Section>
    </>
  );
}
