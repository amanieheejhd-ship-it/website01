import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { JsonLd } from '../components/seo/json-ld';
import { Providers } from '../components/providers';
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Fardeen — We build the moment you walk in',
    template: '%s · Fardeen',
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
    'Fardeen',
  ],
  authors: [{ name: SITE.legalName }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: 'Fardeen — We build the moment you walk in',
    description: SITE.description,
    url: SITE.url,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fardeen — We build the moment you walk in',
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${cormorant.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
