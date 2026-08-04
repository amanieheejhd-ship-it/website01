import type { TestimonialDto } from '@fardeen/types';
import { Container, Section, Surface } from '@fardeen/ui';
import type { Included } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/media';
import { MediaImage } from '../media/media-image';
import { Parallax } from '../motion/parallax';
import { RevealGroup, RevealItem, RevealText } from '../motion/reveal';
import { SectionIntro } from './section-intro';

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div role="img" aria-label={`${r} out of 5 stars`} className="text-sm tracking-widest text-gold">
      <span aria-hidden="true">
        {'★'.repeat(r)}
        <span className="text-white/20">{'★'.repeat(5 - r)}</span>
      </span>
    </div>
  );
}

function TestimonialCard({ t, included }: { t: TestimonialDto; included?: Included }) {
  const avatar = resolveMediaUrl(included, t.avatarMediaId);
  const affiliation = [t.role, t.company].filter(Boolean).join(', ');
  return (
    <RevealItem as="li">
      <Surface variant="glass" as="figure" className="flex h-full flex-col gap-5 p-6">
        <Stars rating={t.rating} />
        {/* Character-split reveal — reads as plain text when motion isn't ready (aria-label carries it). */}
        <RevealText
          as="blockquote"
          split="chars"
          className="flex-1 font-display text-lg leading-relaxed text-foreground"
        >
          {`“${t.quote}”`}
        </RevealText>
        <figcaption className="flex items-center gap-3">
          <Parallax speed={12} className="shrink-0">
            <MediaImage
              url={avatar}
              alt={t.author}
              label={t.author.charAt(0)}
              className="h-11 w-11 rounded-full"
              sizes="44px"
            />
          </Parallax>
          <div>
            <p className="text-sm font-medium text-foreground">{t.author}</p>
            {affiliation ? <p className="text-xs text-muted">{affiliation}</p> : null}
          </div>
        </figcaption>
      </Surface>
    </RevealItem>
  );
}

export function TestimonialsSection({
  testimonials,
  included,
}: {
  testimonials: TestimonialDto[];
  included?: Included;
}) {
  if (testimonials.length === 0) return null;
  return (
    <Section id="testimonials" aria-labelledby="testimonials-heading" className="scroll-mt-20">
      <Container size="wide">
        <SectionIntro
          eyebrow="Testimonials"
          headingId="testimonials-heading"
          title="Trusted by homeowners & businesses"
          lead="A few words from the people we've built for."
        />
        <RevealGroup as="ul" className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} included={included} />
          ))}
        </RevealGroup>
      </Container>
    </Section>
  );
}
