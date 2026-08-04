# Fardeen — Master Reference (Complete Consolidated Document)

> **Ek hi file mein sab kuch.** Yeh document `README.md` + `docs/ARCHITECTURE.md` + `docs/DOMAIN-MODEL.md`
> + `docs/API-CONTRACTS.md` + `docs/CINEMATIC-STORYBOARD.md` — sabhi ka poora nichod hai.
> Kuch bhi miss nahi kiya gaya. Har section apni source file se linked hai.

---

## 0. Ek Line Mein Project

**Fardeen** ek ultra-premium, story-driven website hai ek full-solution construction company ke liye.
Yeh ek normal website nahi — ek **interactive cinematic experience** hai jahan user ke scroll karte hi
khaali zameen se ek luxury villa bante hue banti hai.

Technically yeh ek **production-grade Nx monorepo** hai: ek **Next.js 15** cinematic frontend, jiske
peeche **isolated NestJS microservices** ka fleet ek API gateway ke through kaam karta hai — poora setup
**Docker** se orchestrate hota hai.

---

## 1. Tech Stack (Poora)

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, GSAP + ScrollTrigger, Lenis, React Three Fiber, Three.js, TanStack Query, Zod, React Hook Form |
| **Backend** | NestJS (TypeScript), REST via API Gateway, TCP + Redis microservice transport |
| **Architecture** | Nx Monorepo, Domain-Driven Design (DDD), Clean Architecture, SOLID, Feature-First |
| **Database** | PostgreSQL + Prisma ORM (database-per-service) |
| **Cache / Bus** | Redis (cache + pub/sub event bus) |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | JWT access tokens (RS256) + rotating refresh tokens |
| **Infra** | Docker + Docker Compose (dev & prod), health checks, hot reload |
| **Package Manager** | pnpm workspaces |

---

## 2. Monorepo Layout (Poora Tree)

```
fardeen-website/
├── apps/
│   ├── frontend/              # Next.js 15 cinematic experience + (admin) panel
│   ├── gateway/               # API Gateway (public REST surface)
│   ├── auth-service/          # Identity, JWT, refresh rotation, RBAC
│   ├── cms-service/           # Pages, sections, story content blocks
│   ├── media-service/         # MinIO uploads, presigned URLs, image/video variants
│   ├── project-service/       # Portfolio projects & categories
│   ├── service-management/    # The 12 construction service offerings
│   ├── contact-service/       # Contact form submissions
│   ├── quotation-service/     # Quote requests & lifecycle
│   ├── admin-service/         # BFF aggregation for the admin panel
│   └── notification-service/  # Email / notification fan-out (event-driven)
├── packages/
│   ├── ui/                    # Shared shadcn-based React component library
│   ├── config/               # Shared eslint / tsconfig / tailwind / jest presets
│   ├── shared/               # Shared backend kernel (filters, guards, base classes)
│   ├── types/                # Cross-boundary DTO & contract types (FE ↔ BE)
│   └── utils/                # Framework-agnostic utilities
├── infra/                     # Dockerfiles, DB init, redis/minio config
├── docs/                      # Architecture, domain model, API contracts, storyboard
├── docker-compose.yml         # One-command dev environment
├── docker-compose.prod.yml    # Production topology
├── nx.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

**Nx folder roles:**
- `apps/` → deployable units (thin: sirf wiring; logic layers/packages mein rehti hai)
- `packages/` → shared libraries, internally versioned, path aliases se import hoti hain
- `infra/` → docker + platform config
- `docs/` → documentation

---

## 3. Guiding Principles (6 Core Rules)

1. **Isolation over convenience** — har service apna data khud own karti hai aur independently deploy hoti hai. Koi service dusri ke database ko touch nahi karti.
2. **Clean Architecture har service mein** — domain logic kabhi frameworks, ORMs ya transport par depend nahi karti. Dependencies andar ki taraf point karti hain.
3. **Contracts are code** — saare cross-boundary shapes `packages/types` mein rehte hain, dono producer + consumer share karte hain, Zod se edges par validate hote hain.
4. **Gateway hi ek maatra public door hai** — browser kabhi bhi seedhe kisi service se baat nahi karta.
5. **DRY across the workspace** — shared UI, config, kernel, utils sab packages hain, copies nahi.
6. **Performance is a feature** — cinematic experience ko mid-range hardware par Lighthouse 95+ hit karna hai; har 3D/animation decision ka ek frame budget hai.

---

## 4. System Context Diagram

```
                        ┌──────────────────────────────────────────┐
                        │                Browser                    │
                        │  Next.js 15 (RSC) · R3F · GSAP · Lenis    │
                        └───────────────────┬──────────────────────┘
                                            │ HTTPS / REST (JSON)
                                            │ httpOnly refresh cookie
                                            ▼
                        ┌──────────────────────────────────────────┐
                        │              API Gateway                  │
                        │  REST · JWT verify (RS256) · rate limit   │
                        │  request validation · aggregation         │
                        └───┬───────┬───────┬───────┬───────┬───────┘
                            │ TCP   │ TCP   │ TCP   │ TCP   │ TCP  (sync request/response)
        ┌───────────┬──────┴──┬────┴────┬──┴─────┬─┴──────┬┴─────────┬─────────────┐
        ▼           ▼         ▼         ▼        ▼        ▼          ▼             ▼
   ┌────────┐  ┌────────┐ ┌────────┐ ┌───────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
   │  auth  │  │  cms   │ │project │ │service│ │media │ │contact │ │quotation│ │    admin     │
   └───┬────┘  └───┬────┘ └───┬────┘ └───┬───┘ └──┬───┘ └───┬────┘ └───┬────┘ └──────┬───────┘
       │           │          │          │        │         │          │             │ (BFF calls
       │           │          │          │        │         │          │             │  other svcs)
       ▼           ▼          ▼          ▼        ▼         ▼          ▼
   ┌──────────────────────────────────────────────────┐  ┌──────────┐
   │            PostgreSQL (database-per-service)       │  │  MinIO   │
   │  auth_db · cms_db · project_db · service_db ...    │  │ (S3 API) │
   └──────────────────────────────────────────────────┘  └──────────┘

                    ┌───────────────────────────────────────────┐
                    │   Redis  —  cache  +  pub/sub event bus     │
                    │  events: contact.submitted, quotation.*,    │
                    │  media.uploaded, cms.published ...          │
                    └───────────────┬─────────────────────────────┘
                                    ▼  (subscribes)
                             ┌──────────────┐
                             │ notification │  → email / webhooks
                             └──────────────┘
```

**Do communication planes:**
- **Synchronous (request/response):** Gateway → service, **NestJS TCP transport** ke through, typed message patterns se. Reads aur command results ke liye jinka client wait kar raha hota hai.
- **Asynchronous (events):** services domain events ko **Redis pub/sub** par publish karti hain; interested services (mukhya roop se `notification-service`) subscribe karti hain. Side-effects ko request path se decouple karta hai.

---

## 5. Deployment / Container View

Har box ek Docker container hai jo shared `fardeen-net` network par hai.

| Container | Image base | Exposed | Depends on |
|---|---|---|---|
| `frontend` | node:20-alpine | 3000 | gateway |
| `gateway` | node:20-alpine | 4000 | all services |
| `auth-service` | node:20-alpine | internal (TCP) | postgres, redis |
| `cms-service` | node:20-alpine | internal | postgres, redis |
| `media-service` | node:20-alpine | internal | postgres, minio |
| `project-service` | node:20-alpine | internal | postgres, redis |
| `service-management` | node:20-alpine | internal | postgres, redis |
| `contact-service` | node:20-alpine | internal | postgres, redis |
| `quotation-service` | node:20-alpine | internal | postgres, redis |
| `admin-service` | node:20-alpine | internal | (aggregates services) |
| `notification-service` | node:20-alpine | internal | redis |
| `postgres` | postgres:16-alpine | 5432 | — |
| `redis` | redis:7-alpine | 6379 | — |
| `minio` | minio/minio | 9000/9001 | — |

**Cross-cutting Docker concerns (Phase 3 mein define honge):** pg/redis/minio data aur `node_modules` ke liye named **volumes**, ek isolated **network**, har container par **health checks** with `depends_on: condition: service_healthy`, aur dev mein **hot reload** via bind mounts + Nx watch.

---

## 6. Absolute Imports & Nx Module Boundaries

**Path aliases** (`tsconfig.base.json`) — koi `../../..` nahi:

```jsonc
{
  "@fardeen/ui":     ["packages/ui/src/index.ts"],
  "@fardeen/config": ["packages/config/src/index.ts"],
  "@fardeen/shared": ["packages/shared/src/index.ts"],
  "@fardeen/types":  ["packages/types/src/index.ts"],
  "@fardeen/utils":  ["packages/utils/src/index.ts"]
}
```

**Module-boundary tags** (Nx enforce karta hai — backend service kabhi frontend code import nahi kar sakti, apps aapas mein import nahi kar sakte):

| Tag | Can depend on |
|---|---|
| `type:app-frontend` | `type:ui`, `type:types`, `type:utils` |
| `type:app-service` | `type:shared`, `type:types`, `type:utils` |
| `type:ui` | `type:utils` |
| `type:shared` | `type:types`, `type:utils` |
| `type:types` / `type:utils` | — (leaf, kisi par depend nahi) |

**Shared packages (detail):**
- **`packages/types`** — DTOs, event payloads, message-pattern contracts, Zod schemas. Request shape define karne ki single jagah; gateway, services, frontend sab import karte hain.
- **`packages/shared`** — backend kernel: base `Result`/error types, global exception filter, logging interceptor, correlation-id middleware, `@MessagePattern` contract helper, config loading, Prisma/Redis/MinIO provider factories.
- **`packages/ui`** — shadcn-based React components (Button, Card, glassmorphic surfaces, typography primitives) + Tailwind theme tokens. Frontend aur admin dono consume karte hain.
- **`packages/config`** — eslint, prettier, tsconfig, tailwind, jest presets. One config, many apps.
- **`packages/utils`** — pure helpers (formatting, slugify, guards). Koi framework import nahi.

---

## 7. Microservice Internal Architecture (Clean Architecture + DDD)

Har service same char-layer structure follow karti hai. Dependencies **sirf andar (inward)** point karti hain.

```
apps/<service>/src/
├── domain/                 # ENTERPRISE RULES — no framework imports
│   ├── entities/           # aggregates & entities (rich, behavior-bearing)
│   ├── value-objects/      # Email, Slug, Money, PhoneNumber ...
│   ├── events/             # domain events (ContactSubmitted ...)
│   └── repositories/       # repository INTERFACES (ports)
├── application/            # USE CASES — orchestrates domain, depends on ports
│   ├── use-cases/          # one class per use case (SRP)
│   ├── dto/                # input/output DTOs (mapped from @fardeen/types)
│   └── ports/              # outbound ports (EventPublisher, MediaStore ...)
├── infrastructure/        # ADAPTERS — implements ports, touches the world
│   ├── prisma/             # PrismaService + repository implementations
│   ├── redis/              # cache + event publisher
│   ├── minio/              # object storage adapter (media-service)
│   └── config/             # env schema (Zod-validated)
└── presentation/          # DELIVERY — NestJS controllers over TCP message patterns
    ├── controllers/        # @MessagePattern handlers
    ├── guards/             # auth/role guards where applicable
    └── main.ts             # bootstraps the microservice transport
```

**Rule of thumb:** ek use case ek command DTO leta hai, repository *interface* se aggregates load karta hai, domain behavior execute karta hai, interface se persist karta hai, aur *EventPublisher* port se events emit karta hai. Woh kabhi Prisma, Redis ya Nest decorators import nahi karta.

**Dependency Injection** har service ke Nest module mein interfaces → implementations wire karta hai, taaki domain aur application layers 100% framework-agnostic aur unit-testable rahein (container ke bina).

---

## 8. Data Architecture

**Database-per-service** — ek PostgreSQL instance par alag logical databases, har ek ka apna Prisma schema + generated client. Near-zero dev cost par asli ownership boundaries.

| Service | Database | Owns |
|---|---|---|
| auth-service | `auth_db` | users, credentials, refresh sessions, roles |
| cms-service | `cms_db` | pages, sections, content blocks, testimonials |
| project-service | `project_db` | projects, categories, gallery refs |
| service-management | `service_db` | service offerings, features, pricing tiers |
| contact-service | `contact_db` | contact submissions |
| quotation-service | `quotation_db` | quotation requests, line items, status |
| media-service | `media_db` | asset metadata, variants, ownership refs |
| notification-service | `notification_db` | notification log / delivery status |
| admin-service | — | none (pure aggregator/BFF) |

- **No cross-database joins.** Jab kisi view ko do contexts ka data chahiye (e.g. project media ko reference karta hai), owning service ek **reference id** store karti hai, aur composition gateway/BFF par hoti hai.
- **Caching (Redis):** read-heavy public content (services list, published CMS sections, project listings) explicit keys se cache hota hai aur events (`cms.published` etc.) se invalidate hota hai. Cache ek performance layer hai, kabhi source of truth nahi.
- **Object storage (MinIO):** saare binary assets. `media-service` **presigned upload/download URLs** issue karti hai taaki bytes kabhi gateway se na guzrein. Store hota hai: hero video, scene textures/GLBs, project galleries.

---

## 9. Security

- **Access tokens:** JWT, auth-service dwara **RS256** se sign (private key). Gateway **public key se locally** verify karta hai — per request round-trip nahi. Short TTL (~15 min).
- **Refresh tokens:** opaque, har use par rotate, server-side Redis mein store (revocable), browser ko `httpOnly`, `Secure`, `SameSite=Strict` cookie ke roop mein. Reuse detection poore session family ko invalidate kar deta hai.
- **RBAC:** roles (`admin`, `editor`, `visitor`) access token mein encoded; gateway + service guards per-route enforce karte hain.
- **Edge hardening:** Helmet headers, strict CORS allowlist, global rate limiting + auth/contact/quotation endpoints par stricter limits, body-size caps, har inbound payload par Zod validation.
- **Secrets:** env / Docker secrets se inject — kabhi commit nahi. Keys read-only mount hoti hain.

---

## 10. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Config** | Zod-validated env schema per app; misconfig par boot par hi fail |
| **Logging** | Structured JSON (pino), correlation-id gateway → service → event propagate |
| **Errors** | Shared global exception filter; typed domain errors → HTTP mapping |
| **Validation** | Zod har boundary par (HTTP body, message payload, env) |
| **Observability** | `/health` (liveness) + `/ready` (dependency checks) har container par |
| **Idempotency** | Contact/quotation writes idempotency key accept karte hain (double-submit dedupe) |
| **Migrations** | Prisma migrations per service; dev mein startup par, prod mein ek job ke roop mein |

**Error model:** services ek discriminated `Result<T>` return karti hain (`{ ok: true, data }` | `{ ok: false, error }`); gateway domain errors ko HTTP status par map karta hai ek shared exception filter se. Koi stack trace leak nahi.

---

## 11. Domain Model — Bounded Contexts & Aggregates

> Legend: **(AR)** = aggregate root · _VO_ = value object · ⚡ = emits domain event.
> Har context 1:1 ek microservice se map hota hai aur apna data own karta hai.
> Cross-context links **sirf reference ids** hain — kabhi cross-database foreign keys nahi.

### 11.1 Identity & Access — `auth-service` (`auth_db`)
- **User (AR)** — `id`, `email` _(VO)_, `passwordHash`, `role` (`admin|editor|visitor`), `status`, `createdAt`. Behavior: `verifyPassword`, `changeRole`, `deactivate`.
- **RefreshSession** — `id`, `userId`, `tokenHash`, `familyId`, `userAgent`, `expiresAt`, `revokedAt`. Rotation + reuse-detection yahin.
- Events: ⚡`user.registered`, ⚡`user.roleChanged`.
- Invariants: ek email par ek active credential; refresh reuse poore `familyId` ko revoke karta hai.

### 11.2 Content — `cms-service` (`cms_db`)
- **Page (AR)** — `id`, `slug` _(VO)_, `title`, `status` (`draft|published`), `sections[]`, `seo` _(VO: title, description, ogImageMediaId)_.
- **Section** — `id`, `type` (`hero|scene|richText|gallery|cta`), `order`, `payload` (typed JSON), `mediaRefs[]`. Yeh cinematic story content feed karte hain.
- **Testimonial (AR)** — `id`, `author`, `role`, `company`, `quote`, `rating`, `avatarMediaId`, `featured`.
- Events: ⚡`cms.published` (gateway cache invalidation trigger karta hai).
- Invariants: sirf `published` pages publicly queryable; section `order` per page unique.

### 11.3 Portfolio — `project-service` (`project_db`)
- **Project (AR)** — `id`, `slug` _(VO)_, `title`, `summary`, `body`, `categoryId`, `location`, `year`, `coverMediaId`, `galleryMediaIds[]`, `status`, `featured`, `metrics` _(VO: area, duration)_.
- **Category (AR)** — `id`, `slug`, `name`, `order`. (Home Construction, Interior, Commercial, …)
- Events: ⚡`project.published`.
- Invariants: slug unique; featured project `published` hona chahiye aur cover hona chahiye.

### 11.4 Service Catalog — `service-management` (`service_db`)
12 offerings represent karta hai: **Home Construction, Aluminium Work, Glass Work, ACP Cladding, False Ceiling, Modular Kitchen, Interior Design, Exterior Design, Steel Fabrication, Railings, Renovation, Commercial Projects.**
- **ServiceOffering (AR)** — `id`, `slug` _(VO)_, `name`, `tagline`, `description`, `icon`, `heroMediaId`, `features[]`, `order`, `active`.
- **Feature** — `id`, `title`, `description`, `order`.
- **PricingTier** _(optional)_ — `id`, `name`, `priceFrom` _(Money VO)_, `unit`, `inclusions[]`.
- Invariants: slug unique; `order` catalog display sequence define karta hai.

### 11.5 Contact — `contact-service` (`contact_db`)
- **ContactSubmission (AR)** — `id`, `name`, `email` _(VO)_, `phone` _(VO)_, `subject`, `message`, `source`, `idempotencyKey`, `status` (`new|read|archived`), `createdAt`.
- Events: ⚡`contact.submitted`.
- Invariants: TTL window ke andar duplicate `idempotencyKey` ek no-op hai (double-submit guard).

### 11.6 Quotation — `quotation-service` (`quotation_db`)
- **QuotationRequest (AR)** — `id`, `contact` _(VO: name, email, phone)_, `serviceSlugs[]`, `projectType`, `budgetRange` _(VO)_, `timeline`, `details`, `attachments` (media refs), `status` (`requested|reviewing|quoted|won|lost`), `idempotencyKey`, `createdAt`.
- **QuoteLineItem** _(staff quote karte waqt add)_ — `id`, `label`, `qty`, `unitPrice` _(Money VO)_.
- Events: ⚡`quotation.requested`, ⚡`quotation.statusChanged`.
- Invariants: status transitions defined lifecycle follow karti hain; total line items se derive hota hai.

### 11.7 Media — `media-service` (`media_db`)
- **Asset (AR)** — `id`, `bucket`, `objectKey`, `mime`, `size`, `checksum`, `ownerContext` (`cms|project|quotation`), `ownerId`, `variants[]` (thumb/poster/webp/avif/glb-draco), `status` (`pending|ready`).
- Events: ⚡`media.uploaded`, ⚡`media.ready`.
- Behavior: presigned PUT/GET issue karta hai; variants asynchronously generate karta hai; bytes gateway bypass karte hain.

### 11.8 Notifications — `notification-service` (`notification_db`)
- **Notification (AR)** — `id`, `channel` (`email|webhook`), `template`, `to`, `payload`, `status` (`queued|sent|failed`), `attempts`, `correlationId`.
- Consumes: `contact.submitted`, `quotation.requested`, `quotation.statusChanged` — Redis **Stream** consumer group ke through (durable, retryable). `correlationId` par idempotent.

### 11.9 Admin — `admin-service` (no database)
Pure **BFF/aggregator**. Contexts ke aar-paar read models compose karta hai admin panel ke liye (dashboards, counters, lists) aur commands ko owning service ko forward karta hai. Koi persistent state nahi; dashboard tiles ke liye short-lived Redis caches rakh sakta hai.

### 11.10 Cross-Context Reference Map
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
In references ka composed responses mein resolution **gateway** (public reads) ya **admin-service** (admin reads) par hota hai — kabhi cross-database queries se nahi.

---

## 12. API Contracts

Do surfaces:
1. **Public REST** — jo browser call karta hai (sirf **gateway** expose karta hai).
2. **Internal message patterns** — gateway/BFF aur services ke beech TCP request/response.

Saare shapes ek hi baar **`@fardeen/types`** mein define hote hain aur dono taraf import hote hain. Zod schemas har inbound payload validate karte hain. Responses ek consistent envelope ke saath JSON hote hain.

### 12.1 Response Envelope
```jsonc
// success
{ "data": <T>, "meta": { "requestId": "..." } }

// paginated
{ "data": [<T>], "meta": { "page": 1, "limit": 12, "total": 87, "requestId": "..." } }

// error
{ "error": { "code": "PROJECT_NOT_FOUND", "message": "…", "details": [] }, "meta": { "requestId": "..." } }
```

**Status mapping:** `200/201` success · `400` validation · `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict/idempotency · `429` rate limited · `5xx` upstream failure.

### 12.2 Public REST Surface (Gateway, base `/api/v1`)

**Auth**
| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password }` (prod mein admin-gated) |
| POST | `/auth/login` | — | `{ email, password }` → access token + refresh cookie set |
| POST | `/auth/refresh` | cookie | refresh rotate, naya access token return |
| POST | `/auth/logout` | cookie | refresh session family revoke |
| GET  | `/auth/me` | Bearer | current user profile |

**Content (CMS)**
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/pages/:slug` | — | published page + composed sections (media resolved) |
| GET | `/testimonials` | — | `?featured=true` |

**Services (catalog)**
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/services` | — | ordered active offerings |
| GET | `/services/:slug` | — | single offering + features |

**Projects**
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/projects` | — | `?category=&page=&limit=&featured=` |
| GET | `/projects/:slug` | — | project + gallery (media resolved) |
| GET | `/projects/categories` | — | ordered categories |

**Contact**
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/contact` | — | `{ name, email, phone, subject, message }` + `Idempotency-Key` header; rate limited |

**Quotation**
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/quotations` | — | quote request; `Idempotency-Key`; rate limited |
| GET | `/quotations/:id` | Bearer(admin) | single request |

**Media**
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/media/presign-upload` | Bearer(editor) | → `{ url, fields, assetId }` (direct-to-MinIO) |
| GET | `/media/:id` | — | resolved public/presigned URL + variants |

**Admin (BFF via admin-service, base `/api/v1/admin`, sab `Bearer(admin|editor)`)**
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | aggregated counters (contacts, quotations, projects) |
| GET/POST/PATCH/DELETE | `/admin/projects[/:id]` | project CRUD → project-service |
| GET/POST/PATCH/DELETE | `/admin/services[/:id]` | catalog CRUD → service-management |
| GET/PATCH | `/admin/pages[/:slug]` | CMS editing → cms-service |
| GET/PATCH | `/admin/contacts[/:id]` | triage → contact-service |
| GET/PATCH | `/admin/quotations[/:id]` | lifecycle → quotation-service |

### 12.3 Internal Message Patterns (TCP)
Pattern namespacing: `<context>.<action>`. Har ek `Result<T>` return karta hai.

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

### 12.4 Event Channels (Redis)
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
Har event payload mein `{ id, occurredAt, correlationId, version, data }` hota hai. Notification consumers `correlationId` par dedupe karte hain; durable delivery ek Redis **Stream** with consumer groups use karti hai.

**Event routing (kaun kya sunta hai):**
```
contact.submitted     → notification-service (email to sales + auto-reply)
quotation.requested   → notification-service, admin-service (dashboard counter)
quotation.statusChanged → notification-service (client update)
media.uploaded        → cms/project services (attach variants)
cms.published         → gateway (cache invalidation)
```

### 12.5 Contract Governance
- Kisi bhi shape ka change pehle `@fardeen/types` mein hota hai → producer aur consumer tab tak compile nahi hote jab tak dono update na ho jayein. Koi silent drift nahi.
- Message patterns aur event names **string constants** hain, kabhi inline literals nahi.
- Public REST **versioned** hai (`/api/v1`); breaking change version bump karta hai.
- Gateway REST aur internal patterns ke beech **ek maatra translator** hai.

---

## 13. Frontend Architecture (Feature-First)

```
apps/frontend/src/
├── app/                       # Next.js App Router (RSC by default)
│   ├── (marketing)/           # the cinematic public experience
│   ├── (admin)/               # protected admin panel (BFF: admin-service)
│   ├── layout.tsx
│   └── api/                   # route handlers (BFF proxy, cookie handling)
├── features/                  # self-contained feature modules
│   ├── home-experience/       # Scenes 1–11 director (the WebGL story)
│   ├── services/
│   ├── projects/
│   ├── testimonials/
│   ├── contact/
│   └── quotation/
├── three/                     # R3F: scenes, models, materials, loaders
├── animations/                # GSAP timelines + ScrollTrigger registrations
├── components/                # shared presentational (from @fardeen/ui + local)
├── hooks/                     # reusable hooks (useScrollScene, useLenis, useReducedMotion)
├── lib/                       # api client, TanStack Query setup, Lenis singleton
├── providers/                 # QueryClient, Lenis, Theme, Reduced-Motion providers
└── styles/                    # Tailwind layers, design tokens
```

- **Rendering strategy:** content ke liye static/RSC (SEO + speed); cinematic canvas ek client island hai jo fold-safe hero ke neeche lazy-load hota hai.
- **Data:** initial paint ke liye RSC gateway se fetch karta hai; TanStack Query client interactions (forms, admin) hydrate karta hai.
- **Forms:** React Hook Form + Zod resolver, backend ke saath `@fardeen/types` se schemas share karte hue.

**Animation stack integration:**
- **Lenis** ek hi smooth-scroll source of truth deta hai; iska RAF **GSAP ScrollTrigger** ko drive karta hai (`ScrollTrigger.update` on Lenis scroll) taaki scroll aur animation kabhi desync na ho.
- **GSAP + ScrollTrigger** scene director hai — ek single pinned timeline Scenes 1–11 ko scrub karti hai.
- **R3F/Three.js** 3D world render karta hai; timeline refs ke through camera/scene state mutate karti hai.
- **Framer Motion** DOM sections (12–15) mein component-level micro-interactions handle karta hai.
- **`prefers-reduced-motion`** ek fully accessible static fallback path deta hai.

---

## 14. Cinematic Storyboard (Scenes 1–15)

Public experience ek single scroll-driven narrative hai: khaali zameen se finished luxury villa tak, phir services, projects, testimonials aur contact mein. **Scroll hi timeline hai.**

### 14.1 The Scene Director
- **Ek pinned R3F `<Canvas>`** Scenes 1–11 (WebGL story) host karta hai. Ek tall scroll-spacer se pin hota hai; scroll progress `0 → 1` ek **single GSAP timeline** scrub karta hai.
- **Lenis** ek maatra scroll authority hai; iska RAF `ScrollTrigger.update()` drive karta hai taaki smooth scroll aur animation frame-locked rahein. Koi native scroll listener compete nahi karta.
- Timeline **refs** mutate karti hai (camera position/target, per-object visibility, material params, mesh transforms). React scroll par kabhi re-render nahi karta — GSAP seedhe Three objects par likhta hai 60fps ke liye.
- Scenes 12–15 canvas ke neeche premium **DOM sections** hain: Framer Motion + ScrollTrigger reveals.
- **`prefers-reduced-motion`** → canvas ek single hero still render karta hai aur har section ek static, fully-readable block ban jaata hai. Koi bhi information sirf motion mein nahi rehti.

```
scroll 0 ─────────────────────────────────────────────────────────── 1
│ S1  │ S2 │ S3 │ S4  │ S5 │ S6 │ S7 │ S8 │ S9 │ S10 │ S11 │  ← pinned WebGL (scrubbed)
land   found. walls villa gate living kitch bed  bath terr  reveal
                                                                └────▶ unpin
[ S12 Services ][ S13 Projects ][ S14 Testimonials ][ S15 Contact ]   ← DOM sections
```
Har scene ek normalized progress window own karta hai; director camera keyframes interpolate karta hai aur window boundaries par scene state toggle karta hai eased transitions ke saath (koi hard cut nahi).

### 14.2 Scene-by-Scene (poora)

**Scene 1 — Empty Land (Dawn)**
- *Beat:* kuch exist nahi karta. Fogged ground plane, morning light, drifting birds, wind-swayed grass.
- *Tech:* low-poly terrain, exponential fog, gradient sky, instanced grass with vertex-shader wind, sprite/instanced birds looping path par, subtle camera dolly-in. Ambient wind audio (user gesture tak muted).
- *Scroll:* camera empty plot ke upar aage glide karta hai; title/wordmark fade in phir out.

**Scene 2 — Foundation**
- *Beat:* construction shuru — trench, poured concrete slab, rebar grid rising.
- *Tech:* slab ek clip-plane "pour" reveal par scale up hota hai; instanced steel bars Y ke saath staggered timeline offsets se grow karte hain; dust particle burst. Material roughness wet→cured animate hoti hai.

**Scene 3 — Structure Rises**
- *Beat:* char walls zameen se uthti hain, columns extrude, roof land hoti hai.
- *Tech:* wall meshes `scale.y 0→1` grounded pivot se elastic-out easing se animate; columns stagger; roof settle bounce + impact dust ke saath drop hoti hai. Mass aane par shadows update hoti hain.

**Scene 4 — Transformation to Luxury Villa** *(signature hero moment)*
- *Beat:* raw shell finished villa mein morph — cladding, glass, warm materials.
- *Tech:* "shell" aur "villa" material sets ke beech cross-fade/morph; ACP/glass panels fade in; emissive window glow ramp; environment map golden-hour HDRI par swap.

**Scene 5 — Approach & Gate**
- *Beat:* camera gate ki taraf move karta hai; woh automatically khulta hai.
- *Tech:* camera path entrance tak ease; gate halves hinges par rotate (timeline-driven); landscape/pathway lights sequence mein ignite.

**Scene 6 — Living Room**
- *Beat:* camera andar glide karta hai — interior craftsmanship ka reveal.
- *Tech:* interior set entry par stream in / visible; soft area lighting, furniture, parallax depth. Copy overlay: "Interior Design".

**Scene 7 — Kitchen**
- *Beat:* modular kitchen showcase.
- *Tech:* camera cabinetry ke aar-paar pan; subtle material highlights (counter, metal, glass); micro-animated accents. Copy: "Modular Kitchen".

**Scene 8 — Bedroom**
- *Beat:* warmth aur calm; textiles, ambient light.
- *Tech:* slow dolly, depth-of-field feel via layered fog/bokeh sprite, warm key light.

**Scene 9 — Bathroom**
- *Beat:* premium finishes — tile, glass, chrome.
- *Tech:* reflective/roughness-tuned materials, glass work highlight, gentle specular sweep.

**Scene 10 — Terrace**
- *Beat:* camera terrace tak uthta hai; skyline, railings, open sky.
- *Tech:* camera crane up aur out; railing detail (steel fabrication); sky/time-of-day evening par shift; city bokeh.

**Scene 11 — Complete Villa Reveal** *(the payoff shot)*
- *Beat:* finished, lit villa par dusk mein pull back.
- *Tech:* wide orbit/pull-back, full emissive glow, volumetric-lite god rays, brand line resolve. Canvas yahan **unpin** hota hai, DOM sections ko handoff karta hai.

**Scene 12 — Services**
- *Beat:* 12 offerings premium glassmorphic cards ke roop mein.
- *Tech:* DOM grid; ScrollTrigger staggered reveal; magnetic hover, tilt, gold accent lines. Data: `GET /services`.

**Scene 13 — Projects**
- *Beat:* portfolio showcase.
- *Tech:* horizontal-scroll / masonry gallery ScrollTrigger se pinned; image reveal masks; category filter. Data: `GET /projects`.

**Scene 14 — Testimonials**
- *Beat:* social proof.
- *Tech:* auto/scroll-advancing quote carousel, character-split text reveal (SplitText-style), avatar parallax. Data: `GET /testimonials?featured=true`.

**Scene 15 — Contact**
- *Beat:* shuruaat ka invitation — contact + quotation CTA.
- *Tech:* Framer Motion form (React Hook Form + Zod), inline validation, success micro-animation. `POST /contact` / `POST /quotations`.

### 14.3 Reusable Animation Primitives (Phase 6 mein banenge)
DRY honor karne ke liye scenes shared hooks/components se compose hote hain — har baar bespoke code nahi:
- `useLenis()` — smooth-scroll singleton + ScrollTrigger bridge.
- `useSceneProgress(range)` — ek scene window ke liye normalized 0–1 progress.
- `useReducedMotion()` — poore motion system ko gate karta hai.
- `<ScrollScene>` — ek scene ka scroll window + timeline declare karta hai.
- `<RevealText>` / `<RevealGroup>` — staggered text/element reveals.
- `<MagneticCard>` / `<TiltCard>` — Scenes 12–15 ke liye DOM micro-interactions.
- `three/` primitives: `<InstancedGrass>`, `<Birds>`, `<GrowMesh>`, `<Gate>`, `<CameraRig>`.

---

## 15. Performance, SEO & Accessibility Strategy

- **SEO:** RSC-rendered content, per-route metadata API, JSON-LD (`Organization`, `Service`, `Project`), sitemap + robots, semantic headings, canonical URLs.
- **Assets:** `next/image` with AVIF/WebP; 3D models as compressed **glb (Draco/meshopt)** + **KTX2** textures; hero media as adaptive `HLS`/poster + preload.
- **Delivery:** route-level code splitting, 3D bundle ka dynamic import, `Suspense` boundaries, `next/font` se font subsetting.
- **Runtime budget:** target 60fps; instanced meshes, frustum culling, capped DPR, on-demand frameloop, texture atlases.
- **A11y:** keyboard-navigable, focus-visible, interactive controls par ARIA, reduced-motion fallback, black/gold palette ke against bhi AA+ contrast maintain.
- **Target:** Lighthouse **95+** (Performance, SEO, Best Practices, Accessibility) mid-range mobile par.

### 15.1 Cinematic Performance Budget
| Constraint | Target |
|---|---|
| Frame rate | 60fps desktop / ≥30fps mid mobile |
| Draw calls (peak scene) | < 150 (grass/bars/birds ke liye instancing) |
| WebGL bundle (gz) | < 800 KB (dynamic-imported, hero ke neeche) |
| GLB models | Draco/meshopt compressed, KTX2 textures, LOD jahan useful |
| DPR | capped at `min(devicePixelRatio, 2)` |
| Frameloop | `demand` jahan static; `always` sirf active scrub ke dauraan |
| Initial route | LCP < 2.5s; hero WebGL ka wait kiye bina paint |
| Fallback | full static experience under `prefers-reduced-motion` / no-WebGL |

---

## 16. Architecture Decision Records (ADRs)
Format: **Decision — Context — Consequence.**

- **ADR-001 · Nx monorepo + pnpm.** 10 apps + 5 libs ke liye ek workspace. → Shared tooling, enforced boundaries, affected-only builds/tests, atomic cross-cutting changes. Cost: single-repo CI discipline.
- **ADR-002 · TCP for sync, Redis pub/sub for async.** Ek dedicated broker container avoid karta hai jabki services isolated aur side-effects decoupled rehte hain. → Leaner infra. Trade-off: Redis pub/sub at-most-once hai; ek durability-sensitive consumer (notifications) Redis **Stream** with consumer-group ack use karta hai retry ke liye. RabbitMQ/NATS ka upgrade path `packages/shared` tak localized hai.
- **ADR-003 · Database-per-service.** Asli ownership, independent schema evolution, koi hidden coupling nahi. → Composition gateway/BFF par move; contexts ke beech eventual consistency explicit hai, accidental nahi.
- **ADR-004 · Local RS256 JWT verification at the gateway.** Per request auth round-trip nahi. → Fast, horizontally scalable. Refresh/revocation abhi bhi auth-service + Redis mein centralized.
- **ADR-005 · Admin inside the frontend app.** Single-`frontend` app requirement match karta hai, design system share karta hai, protected route group + `admin-service` BFF se isolated. → Separate app se simpler deploy; middleware + server-side role checks se guarded.
- **ADR-006 · Single pinned R3F canvas as scene director.** Ek WebGL context, ek scrubbed GSAP timeline Scenes 1–11 ke liye. → Predictable performance aur camera continuity vs. many mounted canvases.
- **ADR-007 · Contracts as a shared package.** `@fardeen/types` har boundary ke dono taraf import hota hai. → Shape drift ek compile error ban jaata hai; Zod runtime edge guard karta hai.

---

## 17. Open Decisions (deferred, non-blocking)
- **3D asset sourcing** (Phase 5/6): villa & construction stages ke licensed/commissioned GLB models vs. procedurally generated geometry vs. AI-generated placeholders. WebGL bundle aur art direction ko affect karta hai — Phase 6 se pehle decide.
- **Email transport** notification-service ke liye (SMTP vs. transactional API) — Phase 4 mein decide.
- **Prod hosting target** (VPS/K8s par containers vs. managed) — Phase 9 se pehle decide.

---

## 18. Development Roadmap (Phase Gates)
Build **phase by phase** aage badhta hai. Har phase ek confirmation gate par khatam hota hai.

- [x] **Phase 1 — Architecture**
- [x] **Phase 2 — Nx Monorepo scaffold** (apps, packages, tooling, absolute imports) ← _abhi yahin hain_
- [ ] **Phase 3 — Docker** (dev + prod compose, volumes, networks, health checks, hot reload)
- [ ] **Phase 4 — Backend** (services, Prisma schemas, gateway, auth, contracts)
- [ ] **Phase 5 — Frontend shell** (design system, layout, routing, data layer)
- [ ] **Phase 6 — Cinematic animations** (R3F scenes, GSAP/ScrollTrigger, Lenis)
- [ ] **Phase 7 — Admin panel**
- [ ] **Phase 8 — Testing** (unit, integration, e2e)
- [ ] **Phase 9 — Optimization** (Lighthouse 95+, SEO, a11y, asset budgets)

---

## 19. Quick Start
> Phase 3 mein populate hoga. Target: ek hi command poore platform ko boot kare.
```bash
docker compose up
```

---

## 20. Source File Index
Yeh master document in files se consolidate hua hai:
- [`README.md`](README.md) — project overview, tech stack, layout, roadmap, quick start
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full system architecture & decision records
- [`docs/DOMAIN-MODEL.md`](docs/DOMAIN-MODEL.md) — bounded contexts aur aggregates
- [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) — REST surface + internal message patterns
- [`docs/CINEMATIC-STORYBOARD.md`](docs/CINEMATIC-STORYBOARD.md) — Scenes 1–15 technical breakdown

---

*Yeh document tab tak current hai jab tak upar ki source files na badlein. Kisi shape/contract ke change par pehle `@fardeen/types` update hota hai, phir yeh file.*
