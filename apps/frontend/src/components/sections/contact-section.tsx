import { buttonVariants, Container, Section } from '@fardeen/ui';
import Link from 'next/link';
import { SITE } from '../../lib/site';
import { ContactForm } from '../forms/contact-form';
import { RevealText } from '../motion/reveal';
import { SectionIntro } from './section-intro';

/** Home contact band: pitch + details on the left, a working contact form on the right. */
export function ContactSection() {
  return (
    <Section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20">
      <Container size="wide" className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <SectionIntro
            eyebrow="Start your project"
            headingId="contact-heading"
            title="Tell us what you're building"
            lead="Share a few details and our team will get back to you. Prefer a detailed estimate?"
          />
          <RevealText as="div" className="space-y-1 text-sm text-muted">
            <a href={`mailto:${SITE.email}`} className="block hover:text-foreground">
              {SITE.email}
            </a>
            <a
              href={`tel:${SITE.phone.replace(/\s/g, '')}`}
              className="block hover:text-foreground"
            >
              {SITE.phone}
            </a>
            <p>{SITE.locality}</p>
          </RevealText>
          <RevealText as="div" delay={0.05}>
            <Link href="/contact?subject=Request%20a%20quotation" className={buttonVariants({ variant: 'outline' })}>
              Request a full quotation
            </Link>
          </RevealText>
        </div>
        <RevealText as="div">
          <ContactForm />
        </RevealText>
      </Container>
    </Section>
  );
}
