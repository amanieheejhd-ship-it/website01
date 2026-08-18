import type { Metadata } from 'next';
import { Container, Section } from '@fardeen/ui';
import { PageHeader } from '../../../components/layout/page-header';
import { SectionIntro } from '../../../components/sections/section-intro';
import { ContactForm } from '../../../components/forms/contact-form';
import { SITE } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Tell Ansari Space Craft about your construction or interior project and our team will help you plan the right next steps.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const service = typeof params.service === 'string' ? params.service.trim() : '';
  const requestedSubject = typeof params.subject === 'string' ? params.subject.trim() : '';
  const initialSubject = service || requestedSubject;

  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Let's build something remarkable"
        lead="Tell us what you're planning — we'll come back with clear, practical next steps."
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
            title="Tell us about your project"
            lead="A few details are enough to start — we reply within one business day."
          />
          <ContactForm initialSubject={initialSubject} />
        </Container>
      </Section>
    </>
  );
}
