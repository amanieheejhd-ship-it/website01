'use client';

import { cn } from '@fardeen/ui';
import Image from 'next/image';
import { useState } from 'react';

export interface MediaImageProps {
  /** Resolved url from `included.media` (may be null → placeholder, or 404 → placeholder). */
  url: string | null;
  alt: string;
  /** Short label rendered inside the placeholder (e.g. project title / service name). */
  label?: string;
  className?: string;
  /** Passed to next/image; use `sizes` for responsive images. */
  sizes?: string;
  priority?: boolean;
}

/**
 * next/image with a graceful ink→gold gradient placeholder. Renders the placeholder when
 * there is no url OR when the image fails to load (bytes may not exist yet). Never shows a
 * broken image. The wrapper is `relative` + fills; give it an aspect ratio via `className`.
 */
export function MediaImage({ url, alt, label, className, sizes, priority }: MediaImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  return (
    <div className={cn('relative isolate overflow-hidden bg-surface', className)}>
      {/* Placeholder layer — always present, image paints over it. */}
      <div
        aria-hidden={showImage}
        className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_120%_at_20%_0%,rgba(200,161,90,0.22),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(154,119,54,0.18),#141414_60%)]"
      >
        <span className="pointer-events-none select-none px-4 text-center font-display text-sm uppercase tracking-[0.2em] text-gold/70">
          {label ?? 'Ansari Space Craft'}
        </span>
      </div>
      {showImage ? (
        <Image
          src={url as string}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 33vw'}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        // Keep the alt text available to assistive tech when only the placeholder shows.
        <span className="sr-only">{alt}</span>
      )}
    </div>
  );
}
