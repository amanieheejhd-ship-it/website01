import type { ProjectDto, ProjectListItemDto, ServiceOfferingDto } from '@fardeen/types';
import { absoluteUrl, SITE } from './site';

/** JSON-LD builders (schema.org). Rendered via <script type="application/ld+json">. */

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.legalName,
    alternateName: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phone,
    areaServed: SITE.locality,
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
  };
}

export function serviceJsonLd(offering: ServiceOfferingDto): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: offering.name,
    serviceType: offering.name,
    description: offering.description || offering.tagline,
    url: absoluteUrl(`/services#${offering.slug}`),
    provider: { '@type': 'Organization', name: SITE.legalName, url: SITE.url },
    areaServed: SITE.locality,
  };
}

export function projectJsonLd(project: ProjectDto | ProjectListItemDto): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    url: absoluteUrl(`/projects/${project.slug}`),
    locationCreated: { '@type': 'Place', name: project.location },
    dateCreated: String(project.year),
    creator: { '@type': 'Organization', name: SITE.legalName, url: SITE.url },
  };
}

export function itemListJsonLd(
  name: string,
  items: { url: string; name: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.url,
      name: it.name,
    })),
  };
}
