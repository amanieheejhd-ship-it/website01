import { buttonVariants, Container, Eyebrow, Heading, Lead, Section } from '@fardeen/ui';
import Link from 'next/link';

/** Marketing-group 404 — rendered inside the site header/footer shell. */
export default function NotFound() {
  return (
    <Section spacing="lg">
      <Container size="wide" className="text-center">
        <Eyebrow>404</Eyebrow>
        <Heading as="h1" size="xl" className="mt-3">
          This page has not been built — yet.
        </Heading>
        <Lead className="mx-auto mt-4">
          The page you're looking for doesn't exist or may have moved.
        </Lead>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className={buttonVariants({ size: 'lg' })}>
            Back home
          </Link>
          <Link href="/projects" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            View projects
          </Link>
        </div>
      </Container>
    </Section>
  );
}
