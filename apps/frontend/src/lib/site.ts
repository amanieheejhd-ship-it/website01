/** Site-wide constants + navigation config (single source for header, footer, sitemap, SEO). */

export const SITE = {
  name: 'Ansari Space Craft',
  legalName: 'Ansari Space Craft Construction',
  tagline: 'We build the moment you walk in.',
  description:
    'Ansari Space Craft is a full-solution construction company — home construction, interiors, aluminium & glass, ' +
    'ACP cladding, modular kitchens, steel fabrication and more, delivered end to end.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  email: 'ansarispacecraft@gmail.com',
  phone: '+91 62398 43731',
  locality: 'Zirakpur, Punjab, India',
  // Embeddable Google Map (no API key needed) + the shareable short link for "Get directions".
  mapEmbedUrl: 'https://www.google.com/maps?q=Zirakpur,+Punjab&z=15&output=embed',
  mapLink: 'https://maps.app.goo.gl/YHr7nDzqH12DXZ6f6',
} as const;

export const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/projects', label: 'Projects' },
  { href: '/#testimonials', label: 'Testimonials' },
  { href: '/contact', label: 'Contact' },
] as const;

export const absoluteUrl = (path = '/'): string =>
  `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
