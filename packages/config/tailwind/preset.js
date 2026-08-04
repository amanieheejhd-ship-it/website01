/**
 * Shared Tailwind preset. Apps consume it via:
 *   import preset from '@fardeen/config/tailwind-preset';
 *   export default { presets: [preset], content: [...] };
 *
 * Mirrors packages/config/src/tokens.ts (black/gold luxury palette).
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
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
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
