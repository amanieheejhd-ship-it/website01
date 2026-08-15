'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { PortfolioCategory } from './portfolio-data';
import type { RealCaseStudy } from './real-project-card';
import { RealProjectCard } from './real-project-card';
import { REFERENCE_PORTFOLIO } from './reference-portfolio';

export function CaseStudyBrowser({ categories, projectsByCategory }: { categories: PortfolioCategory[]; projectsByCategory: Record<string, RealCaseStudy[]> }) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug ?? 'construction');
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('category');
    if (requested && categories.some((category) => category.slug === requested)) setActiveSlug(requested);
  }, [categories]);
  const active = categories.find((category) => category.slug === activeSlug) ?? categories[0];
  if (!active) return null;
  const verified = projectsByCategory[active.slug] ?? [];
  const references = REFERENCE_PORTFOLIO[active.slug] ?? [];

  return (
    <div>
      <nav aria-label="Portfolio categories" className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <button key={category.slug} type="button" onClick={() => setActiveSlug(category.slug)} aria-selected={activeSlug === category.slug} role="tab" className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.15em] transition ${activeSlug === category.slug ? 'border-gold/60 bg-gold/10 text-gold' : 'border-white/15 text-muted hover:border-gold/40 hover:text-foreground'}`}>
            {category.number} {category.navLabel}
          </button>
        ))}
      </nav>

      <div key={active.slug} className="portfolio-panel pt-10" role="tabpanel">
        <header className="max-w-3xl">
          <span className="font-display text-6xl text-gold/35 sm:text-7xl">{active.number}</span>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-gold">{active.navLabel}</p>
          <h2 className="mt-3 font-display text-3xl text-foreground sm:text-5xl">{active.title}</h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted">{active.description}</p>
        </header>

        <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {verified.map((project) => <RealProjectCard key={project.id} project={project} categoryName={active.title} />)}
          {references.map((visual, index) => (
            <article key={visual.id} className={`group overflow-hidden rounded-xl border border-white/10 bg-surface transition duration-300 hover:-translate-y-1 hover:border-gold/40 ${index === 0 ? 'xl:col-span-2' : ''}`}>
              <div className={`relative overflow-hidden bg-black ${index === 0 ? 'aspect-[16/8]' : 'aspect-[4/3]'}`}>
                <Image src={visual.image} alt={`${visual.title} reference inspiration`} fill priority={index === 0} sizes={index === 0 ? '(max-width: 1280px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'} className="object-cover transition duration-700 group-hover:scale-[1.025]" />
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-white/75 backdrop-blur">Reference inspiration</span>
              </div>
              <div className="p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-gold">{active.navLabel}</p><h3 className="mt-2 font-display text-2xl text-foreground">{visual.title}</h3><p className="mt-2 text-sm text-muted">{visual.scope}</p></div>
            </article>
          ))}
        </div>
      </div>
      <style jsx global>{`@keyframes portfolio-panel-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } .portfolio-panel { animation: portfolio-panel-in 400ms ease-out; } @media (prefers-reduced-motion: reduce) { .portfolio-panel { animation: none; } }`}</style>
    </div>
  );
}
