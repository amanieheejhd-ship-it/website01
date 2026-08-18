import { Container, Eyebrow, Lead } from '@fardeen/ui';
import Link from 'next/link';
import { HeroTools } from '../interactive/hero-tools';
import { WatchStoryButton } from '../interactive/watch-story';
import { MagneticCard } from '../motion/magnetic-card';

/**
 * Reference-style hero ("We Build Dreams" design language) over the 3D empty-land scene: eyebrow,
 * huge two-line display headline (line 1 white, line 2 gold), short sub, a gold GET A QUOTE CTA and
 * a circular WATCH OUR STORY play affordance that smooth-scrolls into the walkthrough. Fold-safe and
 * fully readable without JS/WebGL; the `data-phase6-canvas-slot` div stays the canvas seam.
 */
export function Hero({ sub }: { sub?: string }) {
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
        {/* Clear of the fixed chapter rail on desktop (the rail sits at the far left edge). */}
        <div className="max-w-3xl space-y-6 lg:pl-24 xl:pl-28">
          <Eyebrow>We don&apos;t just build houses</Eyebrow>
          <h1
            id="hero-heading"
            className="text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl"
          >
            <span className="block text-foreground">We build the moment</span>
            <span className="block text-gold">you walk in.</span>
          </h1>
          <Lead className="max-w-xl">{sub ?? 'From concept to creation — spaces that inspire.'}</Lead>
          <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-7">
            <MagneticCard className="w-full sm:w-auto">
              <Link
                href="/contact?subject=Request a quotation"
                className="premium-cta inline-flex w-full items-center justify-center rounded-full bg-gold px-8 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black sm:w-auto"
              >
                Get a quote
              </Link>
            </MagneticCard>
            <WatchStoryButton />
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
