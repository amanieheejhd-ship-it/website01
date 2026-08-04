import { renderHook } from '@testing-library/react';
import { useMotionReady } from './use-motion-ready';

function mockMatchMedia(matches: boolean): void {
  window.matchMedia = jest.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as typeof window.matchMedia;
}

describe('useMotionReady (motion gating)', () => {
  it('is true after hydration when motion is allowed', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMotionReady());
    expect(result.current).toBe(true);
  });

  it('is false when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMotionReady());
    expect(result.current).toBe(false);
  });
});
