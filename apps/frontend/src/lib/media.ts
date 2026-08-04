import type { MediaRefResolved } from '@fardeen/types';
import type { Included } from './api';

/**
 * Resolve a media reference id to a usable image url from the gateway's `included.media`
 * map. Returns null when the id is absent, unresolved, or has no url — the caller
 * (MediaImage) then renders a graceful ink/gold placeholder instead of a broken <img>.
 *
 * NOTE: even when a url exists it may 404 (no bytes uploaded yet); MediaImage handles that
 * at runtime via onError.
 */
export function resolveMediaUrl(
  included: Included | undefined,
  id: string | null | undefined,
  preferVariant?: string,
): string | null {
  if (!id) return null;
  const ref: MediaRefResolved | undefined = included?.media?.[id];
  if (!ref) return null;
  if (preferVariant) {
    const v = ref.variants?.find((variant) => variant.kind === preferVariant);
    if (v?.url) return v.url;
  }
  return ref.url ?? null;
}
