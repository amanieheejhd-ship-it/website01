/** Site-wide constants + navigation config (single source for header, footer, sitemap, SEO). */

export const SITE = {
  name: 'Fardeen',
  legalName: 'Fardeen Construction',
  tagline: 'We build the moment you walk in.',
  description:
    'Fardeen is a full-solution construction company — home construction, interiors, aluminium & glass, ' +
    'ACP cladding, modular kitchens, steel fabrication and more, delivered end to end.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  email: 'hello@fardeen.example',
  phone: '+91 98765 43210',
  locality: 'Hyderabad, India',
} as const;

export const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/projects', label: 'Projects' },
  { href: '/#testimonials', label: 'Testimonials' },
  { href: '/contact', label: 'Contact' },
] as const;

export const absoluteUrl = (path = '/'): string =>
  `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
