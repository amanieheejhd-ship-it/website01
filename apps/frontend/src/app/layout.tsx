import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { JsonLd } from '../components/seo/json-ld';
import { Providers } from '../components/providers';
import { ParticleField } from '../components/interactive/particle-field';
import { organizationJsonLd, websiteJsonLd } from '../lib/seo';
import { SITE } from '../lib/site';
import './globals.css';

// Bind the shared @fardeen/config font stacks (Inter + Cormorant Garamond) via CSS variables.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'], // 600 is unused across the app — one fewer font file to load
  variable: '--font-display',
  display: 'swap',
});

// Brand title reused across default/OG/Twitter — derived from the single SITE.name brand constant.
const SITE_TITLE = `${SITE.name} — We build the moment you walk in`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'construction',
    'home construction',
    'interior design',
    'modular kitchen',
    'aluminium work',
    'glass work',
    'ACP cladding',
    'steel fabrication',
    SITE.name,
  ],
  authors: [{ name: SITE.legalName }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: SITE_TITLE,
    description: SITE.description,
    url: SITE.url,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${cormorant.variable}`}>
      <body>
        <ParticleField />
        <div className="relative z-10 min-h-full">
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
