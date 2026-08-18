import type { Metadata } from 'next';
import { Container, Section } from '@fardeen/ui';
import { PageHeader } from '../../../components/layout/page-header';
import { SITE } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses and protects the information you share with us.`,
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = '15 August 2026';

/** Simple elegant static page in the site's typography — plain readable legal boilerplate. */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trust & legal"
        title="Privacy policy"
        lead={`How ${SITE.name} handles the information you share with us.`}
      >
        <p className="mt-4 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      </PageHeader>

      <Section spacing="sm" aria-label="Privacy policy">
        <Container size="narrow" className="space-y-10 pb-10 text-[0.95rem] leading-8 text-muted">
          <div>
            <h2 className="font-display text-2xl text-foreground">Who we are</h2>
            <p className="mt-3">
              {SITE.legalName} (&ldquo;{SITE.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a
              full-solution construction and interiors business based in {SITE.locality}. This policy
              explains what information we collect through this website, why we collect it and how it
              is handled.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Information we collect</h2>
            <p className="mt-3">
              We collect only the information you choose to share with us — through the contact form
              or a quotation request: your name, email address, phone number, the subject of your
              enquiry and the details of your project. We do not require an account, and we do not use
              advertising trackers on this site.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">How we use it</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>To respond to your enquiry and discuss your project.</li>
              <li>To prepare estimates, quotations and proposals you have requested.</li>
              <li>To coordinate and deliver services you have engaged us for.</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent or trade your personal information, and we do not share it with
              third parties for their marketing. Details are shared with our project team and
              suppliers only where needed to deliver work you have asked for.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Storage and retention</h2>
            <p className="mt-3">
              Enquiry details are stored on secured systems and are accessible only to the people who
              need them to handle your request. We keep project correspondence for as long as is
              reasonably required to serve you and to meet legal and accounting obligations, after
              which it is deleted.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Your choices</h2>
            <p className="mt-3">
              You may ask us at any time to correct or delete the personal information we hold about
              you, or to stop contacting you. Write to{' '}
              <a href={`mailto:${SITE.email}`} className="text-gold hover:text-gold-light">
                {SITE.email}
              </a>{' '}
              or call{' '}
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="text-gold hover:text-gold-light">
                {SITE.phone}
              </a>
              , and we will act on your request promptly.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-foreground">Changes to this policy</h2>
            <p className="mt-3">
              If this policy changes, the updated version will be published on this page with a
              revised date. Questions are always welcome at {SITE.email}.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
