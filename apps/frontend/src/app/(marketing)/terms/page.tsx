import type { Metadata } from 'next';
import { Container, Section } from '@fardeen/ui';
import { PageHeader } from '../../../components/layout/page-header';
import { SITE } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms on which ${SITE.name} provides its website, quotations and construction services.`,
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = '15 August 2026';

/** Simple elegant static page in the site's typography — plain readable legal boilerplate. */
export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trust & legal"
        title="Terms of service"
        lead={`The terms on which ${SITE.name} provides this website, quotations and services.`}
      >
        <p className="mt-4 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      </PageHeader>

      <Section spacing="sm" aria-label="Terms of service">
        <Container size="narrow" className="space-y-10 pb-10 text-[0.95rem] leading-8 text-muted">
          <div>
            <h2 className="font-display text-2xl text-foreground">About these terms</h2>
            <p className="mt-3">
              This website is operated by {SITE.legalName} (&ldquo;{SITE.name}&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;), {SITE.locality}. By using the site or engaging our
              services you agree to the terms below. Individual projects are always governed first by
              their own written agreement or accepted quotation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Quotations and engagement</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Estimates shared before a site visit are indicative. A binding quotation follows a
                site assessment and is confirmed in writing, with its scope, inclusions and exclusions
                stated.
              </li>
              <li>
                Changes to an agreed scope are priced and confirmed in writing before the additional
                work proceeds.
              </li>
              <li>Payments follow the schedule set out in the accepted quotation or agreement.</li>
              <li>
                Project timelines are planned in good faith and may be affected by weather, statutory
                approvals, material availability or client-side decisions; material delays are
                communicated as they arise.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Workmanship and materials</h2>
            <p className="mt-3">
              Work is executed to the standards and specifications agreed for the project. Materials
              are selected to the agreed specification; where a specified item becomes unavailable, an
              equivalent is proposed for approval before substitution. Snag items identified at
              handover review are resolved as part of completing the agreed scope. Manufacturer
              warranties on fittings, hardware and appliances pass to the client.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Website content</h2>
            <p className="mt-3">
              Content on this site — text, drawings, graphics and the walkthrough experience — belongs
              to {SITE.name} and may not be reproduced commercially without permission. Portfolio
              imagery labelled as reference inspiration is illustrative of capability categories, not
              of completed commissions. We may update site content at any time.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Liability</h2>
            <p className="mt-3">
              Nothing on this website constitutes engineering or legal advice for a specific site.
              While we keep information accurate, we are not liable for decisions taken on the basis of
              website content alone; every project is confirmed through its own assessment and written
              agreement. Our liability on a project is as set out in that project&rsquo;s agreement.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Governing law</h2>
            <p className="mt-3">
              These terms are governed by the laws of India, and any dispute is subject to the
              jurisdiction of the courts at Zirakpur, Punjab, India.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Contact</h2>
            <p className="mt-3">
              Questions about these terms:{' '}
              <a href={`mailto:${SITE.email}`} className="text-gold hover:text-gold-light">
                {SITE.email}
              </a>{' '}
              ·{' '}
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="text-gold hover:text-gold-light">
                {SITE.phone}
              </a>
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
