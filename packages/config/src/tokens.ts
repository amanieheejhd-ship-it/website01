/**
 * Design tokens — the black/gold luxury palette shared by frontend + admin
 * (docs/ARCHITECTURE.md §11 A11y note: AA+ contrast against black/gold).
 * The Tailwind preset (tailwind/preset.js) mirrors these values.
 */
export const tokens = {
  colors: {
    background: '#0a0a0a',
    surface: '#141414',
    foreground: '#f5f5f4',
    muted: '#9ca3af',
    gold: {
      DEFAULT: '#c8a15a',
      light: '#e5c987',
      dark: '#9a7736',
    },
    border: 'rgba(200, 161, 90, 0.24)',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  font: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
  },
} as const;

export type DesignTokens = typeof tokens;
