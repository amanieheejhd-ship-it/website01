import preset from '@fardeen/config/tailwind-preset';
import type { Config } from 'tailwindcss';

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Bind the shared @fardeen/config font stacks to the next/font CSS variables
      // set on <html> in the root layout (Inter → --font-sans, Cormorant → --font-display).
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },
} satisfies Config;
