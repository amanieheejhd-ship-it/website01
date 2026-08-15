import { buttonVariants, Container, Eyebrow, Heading, Lead } from '@fardeen/ui';
import Link from 'next/link';
import { HeroTools } from '../interactive/hero-tools';
import { MagneticCard } from '../motion/magnetic-card';

/**
 * Fold-safe static hero. Fully readable without JS/WebGL. The `data-phase6-canvas-slot`
 * div is the explicit seam where the pinned R3F <Canvas> (Scenes 1–11) mounts in Phase 6;
 * until then it stays an empty, non-interactive layer behind this content.
 */
export function Hero({ headline, sub }: { headline: string; sub: string }) {
  return (
    <section aria-labelledby="hero-heading" className="hero-seam relative flex min-h-[86svh] items-center">
      <div
        data-phase6-canvas-slot
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      />
      {/* Decorative right-side construction cluster (desktop only, reduced-motion static). */}
      <HeroTools />
      <Container size="wide" className="relative z-10 py-20 sm:py-24">
        <div className="max-w-3xl space-y-6">
          <Eyebrow>Full-solution construction · {`Foundation to finish`}</Eyebrow>
          <Heading as="h1" id="hero-heading" size="xl" className="text-balance">
            {headline}
          </Heading>
          <Lead>{sub}</Lead>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:gap-4">
            <MagneticCard className="w-full sm:w-auto">
              <Link href="/contact" className={`${buttonVariants({ size: 'lg' })} premium-cta w-full sm:w-auto`}>
                Start your project
              </Link>
            </MagneticCard>
            <MagneticCard className="w-full sm:w-auto">
              <Link href="/projects" className={`${buttonVariants({ size: 'lg', variant: 'outline' })} premium-cta w-full sm:w-auto`}>
                View our work
              </Link>
            </MagneticCard>
          </div>
        </div>
      </Container>
      <p
        aria-hidden="true"
        className="absolute inset-x-0 bottom-5 text-center text-[0.7rem] uppercase tracking-[0.3em] text-muted/60"
      >
        Scroll to explore
      </p>
    </section>
  );
}
