import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from './use-reduced-motion';

interface FakeMql {
  matches: boolean;
  media: string;
  addEventListener: (t: string, cb: (e: { matches: boolean }) => void) => void;
  removeEventListener: (t: string, cb: (e: { matches: boolean }) => void) => void;
  dispatchChange: (matches: boolean) => void;
}

function mockMatchMedia(initial: boolean): FakeMql {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql: FakeMql = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_t, cb) => void listeners.add(cb),
    removeEventListener: (_t, cb) => void listeners.delete(cb),
    dispatchChange: (matches) => {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches }));
    },
  };
  window.matchMedia = jest.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return mql;
}

describe('useReducedMotion', () => {
  it('reflects a "no reduced motion" preference after measuring', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('is true when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates live when the media query changes', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => mql.dispatchChange(true));
    expect(result.current).toBe(true);
    act(() => mql.dispatchChange(false));
    expect(result.current).toBe(false);
  });

  it('unsubscribes the change listener on unmount', () => {
    const mql = mockMatchMedia(false);
    const removeSpy = jest.spyOn(mql, 'removeEventListener');
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
