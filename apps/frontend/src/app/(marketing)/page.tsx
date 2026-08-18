import type { Metadata } from 'next';
import { getHomePage } from '../../lib/api';
import { SITE } from '../../lib/site';
import { CinematicMount } from '../../components/cinematic/cinematic-mount';
import { Hero } from '../../components/sections/hero';
import { UnderOneRoofSection } from '../../components/sections/under-one-roof';
import { FeaturedProjectsSection } from '../../components/sections/featured-projects';
import { StatsSection } from '../../components/sections/stats-counters';
import { CtaBandSection } from '../../components/sections/cta-band';

// Static shell + hourly ISR. The homepage is the owner-approved "We Build Dreams" reference layout:
// hero → 3D cinematic walkthrough (with chapter rail / caption cards / room menu) → icon band →
// code-drawn featured projects → stat counters → CTA band → footer. Every visual is the live 3D
// canvas or code-drawn SVG/CSS — no photographs. All showcase content is CURATED LOCAL DATA (the
// body reads nothing from the DB, so test entries can never leak here); only SEO metadata still
// consults the CMS with a graceful fallback.
export const revalidate = 3600;

/** Degrade gracefully — the CMS being down must not blank the metadata. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const home = await safe(getHomePage(), null);
  const seo = home?.data.seo;
  // Always emit a concrete title — never `undefined` (which can drop the <title> entirely if the
  // CMS is briefly unreachable during an ISR revalidation).
  return {
    title: { absolute: seo?.title || `${SITE.name} — We build the moment you walk in` },
    description: seo?.description || SITE.description,
    alternates: { canonical: '/' },
  };
}

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* The pinned cinematic journey — client-only, gated on motion + WebGL. With motion off / no
          WebGL / small screens this renders the reference-styled static navigator instead. */}
      <CinematicMount />

      <UnderOneRoofSection />
      <FeaturedProjectsSection />
      <StatsSection />
      <CtaBandSection />
    </>
  );
}
