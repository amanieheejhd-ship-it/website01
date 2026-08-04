# API Contracts

Two surfaces:
1. **Public REST** — what the browser calls (exposed only by the **gateway**).
2. **Internal message patterns** — TCP request/response between gateway/BFF and services.

All shapes are defined once in **`@fardeen/types`** and imported by both sides. Zod schemas validate
every inbound payload. Responses are JSON with a consistent envelope.

---

## Response Envelope

```jsonc
// success
{ "data": <T>, "meta": { "requestId": "..." } }

// paginated
{ "data": [<T>], "meta": { "page": 1, "limit": 12, "total": 87, "requestId": "..." } }

// error
{ "error": { "code": "PROJECT_NOT_FOUND", "message": "…", "details": [] }, "meta": { "requestId": "..." } }
```

Status mapping: `200/201` success · `400` validation · `401` unauthenticated · `403` forbidden ·
`404` not found · `409` conflict/idempotency · `429` rate limited · `5xx` upstream failure.

---

## 1. Public REST Surface (Gateway, base `/api/v1`)

### Auth
| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password }` (admin-gated in prod) |
| POST | `/auth/login` | — | `{ email, password }` → access token + sets refresh cookie |
| POST | `/auth/refresh` | cookie | rotates refresh, returns new access token |
| POST | `/auth/logout` | cookie | revokes refresh session family |
| GET  | `/auth/me` | Bearer | current user profile |

### Content (CMS)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/pages/:slug` | — | published page + composed sections (media resolved) |
| GET | `/testimonials` | — | `?featured=true` |

### Services (catalog)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/services` | — | ordered active offerings |
| GET | `/services/:slug` | — | single offering + features |

### Projects
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/projects` | — | `?category=&page=&limit=&featured=` |
| GET | `/projects/:slug` | — | project + gallery (media resolved) |
| GET | `/projects/categories` | — | ordered categories |

### Contact
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/contact` | — | `{ name, email, phone, subject, message }` + `Idempotency-Key` header; rate limited |

### Quotation
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/quotations` | — | quote request; `Idempotency-Key`; rate limited |
| GET | `/quotations/:id` | Bearer(admin) | single request |

### Media
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/media/presign-upload` | Bearer(editor) | → `{ url, fields, assetId }` (direct-to-MinIO) |
| GET | `/media/:id` | — | resolved public/presigned URL + variants |

### Admin (BFF via admin-service, base `/api/v1/admin`, all `Bearer(admin|editor)`)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | aggregated counters (contacts, quotations, projects) |
| GET/POST/PATCH/DELETE | `/admin/projects[/:id]` | project CRUD → project-service |
| GET/POST/PATCH/DELETE | `/admin/services[/:id]` | catalog CRUD → service-management |
| GET/PATCH | `/admin/pages[/:slug]` | CMS editing → cms-service |
| GET/PATCH | `/admin/contacts[/:id]` | triage → contact-service |
| GET/PATCH | `/admin/quotations[/:id]` | lifecycle → quotation-service |

---

## 2. Internal Message Patterns (TCP)

Pattern namespacing: `<context>.<action>`. Each returns a `Result<T>`.

```ts
// packages/types/src/contracts/index.ts  (illustrative)

export const AUTH_PATTERNS = {
  login:    'auth.login',
  refresh:  'auth.refresh',
  logout:   'auth.logout',
  validate: 'auth.validate',   // gateway may call for revocation-sensitive checks
  me:       'auth.me',
} as const;

export const CMS_PATTERNS = {
  getPage:       'cms.getPage',
  listTestimonials: 'cms.listTestimonials',
  publishPage:   'cms.publishPage',
} as const;

export const SERVICE_PATTERNS = {
  list:      'service.list',
  getBySlug: 'service.getBySlug',
  upsert:    'service.upsert',
} as const;

export const PROJECT_PATTERNS = {
  list:        'project.list',
  getBySlug:   'project.getBySlug',
  listCategories: 'project.listCategories',
  create:      'project.create',
  update:      'project.update',
  remove:      'project.remove',
} as const;

export const CONTACT_PATTERNS = {
  submit: 'contact.submit',
  list:   'contact.list',
  setStatus: 'contact.setStatus',
} as const;

export const QUOTATION_PATTERNS = {
  request:   'quotation.request',
  get:       'quotation.get',
  list:      'quotation.list',
  setStatus: 'quotation.setStatus',
} as const;

export const MEDIA_PATTERNS = {
  presignUpload: 'media.presignUpload',
  get:           'media.get',
  resolveMany:   'media.resolveMany',   // batch-resolve refs for composition
} as const;
```

### Event channels (Redis)

```ts
export const EVENTS = {
  contactSubmitted:     'contact.submitted',
  quotationRequested:   'quotation.requested',
  quotationStatusChanged: 'quotation.statusChanged',
  mediaUploaded:        'media.uploaded',
  mediaReady:           'media.ready',
  cmsPublished:         'cms.published',
  userRegistered:       'user.registered',
} as const;
```

Every event payload includes `{ id, occurredAt, correlationId, version, data }`. Notification
consumers dedupe on `correlationId`; durable delivery uses a Redis **Stream** with consumer groups.

---

## 3. Contract Governance

- A change to any shape happens in `@fardeen/types` first → producer and consumer fail to compile
  until both are updated. No silent drift.
- Message patterns and event names are **string constants**, never inline literals.
- Public REST is **versioned** (`/api/v1`); breaking changes bump the version.
- The gateway is the **only** translator between REST and internal patterns.
