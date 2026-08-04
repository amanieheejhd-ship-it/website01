'use client';

import { createContext, useContext, type ReactNode } from 'react';

type Theme = 'dark';
const ThemeContext = createContext<{ theme: Theme }>({ theme: 'dark' });

/**
 * Theme context. The Fardeen palette is dark-only (ink/gold) — `<html class="dark">` is
 * fixed in the root layout. This provider exists so future light/high-contrast themes have
 * a single seam without touching consumers.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme: 'dark' }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
