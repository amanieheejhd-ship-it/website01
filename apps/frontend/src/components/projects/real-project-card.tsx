'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface RealCaseStudy {
  id: string;
  slug: string;
  title: string;
  location: string;
  summary: string;
  year: number | null;
  categoryId: string;
  images: string[];
}

export function RealProjectCard({ project, categoryName }: { project: RealCaseStudy; categoryName: string }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused || project.images.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % project.images.length), 5000);
    return () => window.clearTimeout(timer);
  }, [active, paused, project.images.length, visible]);

  const move = (direction: number) => setActive((value) => (value + direction + project.images.length) % project.images.length);

  return (
    <article ref={root} className="group overflow-hidden rounded-xl border border-white/10 bg-surface transition duration-300 hover:-translate-y-1 hover:border-gold/40" onMouseEnter={() => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) setPaused(true); }} onMouseLeave={() => setPaused(false)} onFocusCapture={(event) => { if (event.target instanceof Element && event.target.matches(':focus-visible')) setPaused(true); }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        {project.images.length ? project.images.map((src, index) => <Image key={src} src={src} alt={`${project.title} — image ${index + 1}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className={`object-cover transition duration-700 ${index === active ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.025]'}`} />) : <div className="grid h-full place-items-center px-8 text-center text-xs uppercase tracking-[0.2em] text-muted">Verified imagery pending upload</div>}
        {project.images.length > 1 ? <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-12"><span className="font-mono text-xs text-white/80">{String(active + 1).padStart(2, '0')} / {String(project.images.length).padStart(2, '0')}</span><div className="flex gap-2"><button type="button" aria-label="Previous project image" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white">←</button><button type="button" aria-label="Next project image" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white">→</button></div></div> : null}
      </div>
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Verified project · {categoryName}</p>
        <h3 className="mt-3 font-display text-2xl text-foreground">{project.title}</h3>
        <p className="mt-2 text-sm text-muted">{project.location || 'Location not published'}{project.year ? ` · ${project.year}` : ''}</p>
        {project.summary ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{project.summary}</p> : null}
        <Link href={`/projects/${project.slug}`} className="mt-5 inline-block text-sm text-foreground underline decoration-gold/50 underline-offset-4">View project</Link>
      </div>
    </article>
  );
}
