# Domain Model

Bounded contexts and their aggregates. Each context maps 1:1 to a microservice and owns its data.
Cross-context links are **reference ids only** — never foreign keys across databases.

Legend: **(AR)** = aggregate root · _VO_ = value object · ⚡ = emits domain event

---

## Identity & Access — `auth-service` (`auth_db`)

- **User (AR)** — `id`, `email` _(VO)_, `passwordHash`, `role` (`admin|editor|visitor`), `status`,
  `createdAt`. Behavior: `verifyPassword`, `changeRole`, `deactivate`.
- **RefreshSession** — `id`, `userId`, `tokenHash`, `familyId`, `userAgent`, `expiresAt`,
  `revokedAt`. Rotation + reuse-detection live here.
- Events: ⚡`user.registered`, ⚡`user.roleChanged`.
- Invariants: one active credential per email; refresh reuse revokes the whole `familyId`.

## Content — `cms-service` (`cms_db`)

- **Page (AR)** — `id`, `slug` _(VO)_, `title`, `status` (`draft|published`), `sections[]`,
  `seo` _(VO: title, description, ogImageMediaId)_.
- **Section** — `id`, `type` (`hero|scene|richText|gallery|cta`), `order`, `payload` (typed JSON),
  `mediaRefs[]`. These feed the cinematic story content.
- **Testimonial (AR)** — `id`, `author`, `role`, `company`, `quote`, `rating`, `avatarMediaId`,
  `featured`.
- Events: ⚡`cms.published` (triggers gateway cache invalidation).
- Invariants: only `published` pages are publicly queryable; section `order` is unique per page.

## Portfolio — `project-service` (`project_db`)

- **Project (AR)** — `id`, `slug` _(VO)_, `title`, `summary`, `body`, `categoryId`, `location`,
  `year`, `coverMediaId`, `galleryMediaIds[]`, `status`, `featured`, `metrics` _(VO: area, duration)_.
- **Category (AR)** — `id`, `slug`, `name`, `order`. (Home Construction, Interior, Commercial, …)
- Events: ⚡`project.published`.
- Invariants: slug unique; a featured project must be `published` and have a cover.

## Service Catalog — `service-management` (`service_db`)

Represents the 12 offerings (Home Construction, Aluminium Work, Glass Work, ACP Cladding, False
Ceiling, Modular Kitchen, Interior Design, Exterior Design, Steel Fabrication, Railings, Renovation,
Commercial Projects).

- **ServiceOffering (AR)** — `id`, `slug` _(VO)_, `name`, `tagline`, `description`, `icon`,
  `heroMediaId`, `features[]`, `order`, `active`.
- **Feature** — `id`, `title`, `description`, `order`.
- **PricingTier** _(optional)_ — `id`, `name`, `priceFrom` _(Money VO)_, `unit`, `inclusions[]`.
- Invariants: slug unique; `order` defines catalog display sequence.

## Contact — `contact-service` (`contact_db`)

- **ContactSubmission (AR)** — `id`, `name`, `email` _(VO)_, `phone` _(VO)_, `subject`, `message`,
  `source`, `idempotencyKey`, `status` (`new|read|archived`), `createdAt`.
- Events: ⚡`contact.submitted`.
- Invariants: duplicate `idempotencyKey` within a TTL window is a no-op (double-submit guard).

## Quotation — `quotation-service` (`quotation_db`)

- **QuotationRequest (AR)** — `id`, `contact` _(VO: name, email, phone)_, `serviceSlugs[]`,
  `projectType`, `budgetRange` _(VO)_, `timeline`, `details`, `attachments` (media refs),
  `status` (`requested|reviewing|quoted|won|lost`), `idempotencyKey`, `createdAt`.
- **QuoteLineItem** _(added when staff quote)_ — `id`, `label`, `qty`, `unitPrice` _(Money VO)_.
- Events: ⚡`quotation.requested`, ⚡`quotation.statusChanged`.
- Invariants: status transitions follow the defined lifecycle; total derived from line items.

## Media — `media-service` (`media_db`)

- **Asset (AR)** — `id`, `bucket`, `objectKey`, `mime`, `size`, `checksum`, `ownerContext`
  (`cms|project|quotation`), `ownerId`, `variants[]` (thumb/poster/webp/avif/glb-draco),
  `status` (`pending|ready`).
- Events: ⚡`media.uploaded`, ⚡`media.ready`.
- Behavior: issues presigned PUT/GET; generates variants asynchronously; bytes bypass the gateway.

## Notifications — `notification-service` (`notification_db`)

- **Notification (AR)** — `id`, `channel` (`email|webhook`), `template`, `to`, `payload`,
  `status` (`queued|sent|failed`), `attempts`, `correlationId`.
- Consumes: `contact.submitted`, `quotation.requested`, `quotation.statusChanged` via a Redis
  **Stream** consumer group (durable, retryable). Idempotent on `correlationId`.

## Admin — `admin-service` (no database)

Pure **BFF/aggregator**. Composes read models across contexts for the admin panel (dashboards,
counters, lists) and forwards commands to the owning service. Holds no persistent state; may keep
short-lived Redis caches for dashboard tiles.

---

## Cross-Context Reference Map

```
Page.section.mediaRefs        ──▶ media-service (Asset.id)
Project.coverMediaId          ──▶ media-service
Project.galleryMediaIds       ──▶ media-service
Project.categoryId            ──▶ project-service (same context)
ServiceOffering.heroMediaId   ──▶ media-service
QuotationRequest.serviceSlugs ──▶ service-management (ServiceOffering.slug)
QuotationRequest.attachments  ──▶ media-service
Testimonial.avatarMediaId     ──▶ media-service
```

Resolution of these references into composed responses happens at the **gateway** (public reads) or
**admin-service** (admin reads) — never via cross-database queries.
