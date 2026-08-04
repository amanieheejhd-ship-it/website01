'use client';

import { m } from 'framer-motion';
import type { ComponentType, ElementType, ReactNode } from 'react';
import { useMotionReady } from '../../hooks/use-motion-ready';

const EASE = [0.22, 1, 0.36, 1] as const;

// Motion variants of the semantic tags we reveal (LazyMotion `m` — small feature bundle).
/* eslint-disable @typescript-eslint/no-explicit-any */
const MOTION: Record<string, ComponentType<any>> = {
  div: m.div,
  section: m.section,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  h2: m.h2,
  h3: m.h3,
  p: m.p,
  span: m.span,
  article: m.article,
  figure: m.figure,
  blockquote: m.blockquote,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

type Tag = keyof typeof MOTION;

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const itemV = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
// Image-reveal mask: the item unmasks from a clipped inset (used for project cards).
const itemMaskV = {
  hidden: { opacity: 0, clipPath: 'inset(14% 0% 14% 0%)' },
  show: {
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: { duration: 0.7, ease: EASE },
  },
};

/** Single on-scroll fade-up reveal. Optional per-word / per-character stagger when `children`
 *  is a string. Renders plain, visible markup until motion is ready (SSR / no-JS / reduced). */
export function RevealText({
  as = 'div',
  className,
  children,
  y = 20,
  delay = 0,
  split = 'none',
  amount = 0.35,
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
  y?: number;
  delay?: number;
  split?: 'none' | 'words' | 'chars';
  amount?: number;
}) {
  const ready = useMotionReady();
  const Plain = as as ElementType;

  if (!ready || (split !== 'none' && typeof children !== 'string')) {
    return <Plain className={className}>{children}</Plain>;
  }
  const M = MOTION[as] ?? m.div;

  if (split === 'none') {
    return (
      <M
        className={className}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.6, delay, ease: EASE }}
      >
        {children}
      </M>
    );
  }

  const text = children as string;
  const charV = {
    hidden: { opacity: 0, y: '0.45em' },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  };
  const units = split === 'chars' ? Array.from(text) : text.split(/(\s+)/);
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: split === 'chars' ? 0.016 : 0.05 } } }}
    >
      {/* Full text for assistive tech; the animated glyphs below are decorative. */}
      <span className="sr-only">{text}</span>
      {units.map((u, i) =>
        u.trim() === '' ? (
          <span key={i} aria-hidden="true">
            {' '}
          </span>
        ) : (
          <m.span key={i} aria-hidden="true" className="inline-block will-change-transform" variants={charV}>
            {u}
          </m.span>
        ),
      )}
    </M>
  );
}

/** Staggered on-scroll reveal container. Wrap direct children in <RevealItem>. */
export function RevealGroup({
  as = 'div',
  className,
  children,
  amount = 0.2,
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
  amount?: number;
}) {
  const ready = useMotionReady();
  const Plain = as as ElementType;
  if (!ready) return <Plain className={className}>{children}</Plain>;
  const M = MOTION[as] ?? m.div;
  return (
    <M
      className={className}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </M>
  );
}

/** A staggered item inside a <RevealGroup> (inherits the parent's show/hidden state).
 *  `variant="mask"` unmasks the item (image-reveal-mask feel) instead of a fade-up. */
export function RevealItem({
  as = 'div',
  className,
  children,
  variant = 'rise',
}: {
  as?: Tag;
  className?: string;
  children: ReactNode;
  variant?: 'rise' | 'mask';
}) {
  const ready = useMotionReady();
  const Plain = as as ElementType;
  if (!ready) return <Plain className={className}>{children}</Plain>;
  const M = MOTION[as] ?? m.div;
  return (
    <M className={className} variants={variant === 'mask' ? itemMaskV : itemV}>
      {children}
    </M>
  );
}
