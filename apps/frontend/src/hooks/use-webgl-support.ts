'use client';

import { useEffect, useState } from 'react';

/**
 * Detects usable WebGL. Returns null until checked (SSR-safe), then boolean. When false, the
 * cinematic layer must not mount and the static Phase-5 experience stands in unchanged.
 */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      setSupported(Boolean(gl));
      // Free the probe context.
      const lose = gl && (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
      lose?.loseContext?.();
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}
