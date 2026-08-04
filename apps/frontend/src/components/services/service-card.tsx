import type { ServiceOfferingDto } from '@fardeen/types';
import { Badge, Card, CardBody, CardMeta, CardTitle } from '@fardeen/ui';

export function ServiceCard({ offering }: { offering: ServiceOfferingDto }) {
  return (
    <Card id={offering.slug} interactive className="h-full scroll-mt-24">
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <span aria-hidden="true" className="font-display text-2xl text-gold/70">
            {String(offering.order + 1).padStart(2, '0')}
          </span>
          {offering.features.length > 0 ? (
            <Badge variant="outline">{offering.features.length} inclusions</Badge>
          ) : null}
        </div>
        <CardTitle>{offering.name}</CardTitle>
        <p className="text-sm font-medium text-gold/90">{offering.tagline}</p>
        <CardMeta className="flex-1">{offering.description}</CardMeta>
        {offering.features.length > 0 ? (
          <ul className="mt-1 space-y-1.5 text-sm text-muted">
            {offering.features.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span aria-hidden="true" className="text-gold">
                  —
                </span>
                {f.title}
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
