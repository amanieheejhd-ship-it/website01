# Architecture

Fardeen is a **feature-first Nx monorepo** hosting a cinematic Next.js 15 frontend and a fleet
of **isolated NestJS microservices** behind a single API gateway. This document is the source of
truth for structure, boundaries, communication, data ownership, and cross-cutting concerns.

---

## 1. Guiding Principles

1. **Isolation over convenience** — every service owns its data and deploys independently. No
   service reaches into another's database.
2. **Clean Architecture in every service** — domain logic never depends on frameworks, ORMs, or
   transport. Dependencies point inward.
3. **Contracts are code** — all cross-boundary shapes live in `packages/types` and are shared by
   both producer and consumer, validated with Zod at the edges.
4. **The gateway is the only public door** — the browser never talks to a service directly.
5. **DRY across the workspace** — shared UI, config, kernel, and utils are packages, not copies.
6. **Performance is a feature** — the cinematic experience must hit Lighthouse 95+ on mid-range
   hardware; every 3D/animation decision carries a frame budget.

---

## 2. System Context

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

**Two communication planes:**
- **Synchronous (request/response):** Gateway → service over **NestJS TCP transport** using
  typed message patterns. Used for reads and command results the client is waiting on.
- **Asynchronous (events):** services publish domain events to **Redis pub/sub**; interested
  services (chiefly `notification-service`) subscribe. Decouples side effects from the request path.

---

## 3. Deployment / Container View

Every box below is a Docker container on a shared `fardeen-net` network.

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

Cross-cutting Docker concerns (defined in Phase 3): named **volumes** for pg/redis/minio data
and `node_modules`, an isolated **network**, **health checks** on every container with
`depends_on: condition: service_healthy`, and **hot reload** via bind mounts + Nx watch in dev.

---

## 4. Monorepo Structure (Nx)

```
apps/         → deployable units (thin: wiring only, logic lives in layers/packages)
packages/     → shared libraries, versioned internally, imported via path aliases
infra/        → docker + platform config
docs/         → this documentation
```

**Absolute imports** via `tsconfig.base.json` path aliases (no `../../..`):

```jsonc
{
  "@fardeen/ui":     ["packages/ui/src/index.ts"],
  "@fardeen/config": ["packages/config/src/index.ts"],
  "@fardeen/shared": ["packages/shared/src/index.ts"],
  "@fardeen/types":  ["packages/types/src/index.ts"],
  "@fardeen/utils":  ["packages/utils/src/index.ts"]
}
```

Nx enforces boundaries with **module-boundary tags** so, e.g., a backend service can never import
frontend code, and apps can't import each other:

| Tag | Can depend on |
|---|---|
| `type:app-frontend` | `type:ui`, `type:types`, `type:utils` |
| `type:app-service` | `type:shared`, `type:types`, `type:utils` |
| `type:ui` | `type:utils` |
| `type:shared` | `type:types`, `type:utils` |
| `type:types` / `type:utils` | — (leaf) |

### Shared packages

- **`packages/types`** — DTOs, event payloads, message-pattern contracts, Zod schemas. The single
  place a request shape is defined; imported by gateway, services, and frontend alike.
- **`packages/shared`** — backend kernel: base `Result`/error types, global exception filter,
  logging interceptor, correlation-id middleware, a `@MessagePattern` contract helper, config
  loading, Prisma/Redis/MinIO provider factories.
- **`packages/ui`** — shadcn-based React components (Button, Card, glassmorphic surfaces, typography
  primitives) + Tailwind theme tokens. Consumed by frontend and admin.
- **`packages/config`** — eslint, prettier, tsconfig, tailwind, jest presets. One config, many apps.
- **`packages/utils`** — pure helpers (formatting, slugify, guards). No framework imports.

---

## 5. Microservice Internal Architecture (Clean Architecture + DDD)

Every service follows the same four-layer structure. Dependencies point **inward only**.

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

**Rule of thumb:** a use case receives a command DTO, loads aggregates through a repository
*interface*, executes domain behavior, persists via the interface, and emits events through an
*EventPublisher* port. It never imports Prisma, Redis, or Nest decorators.

**Dependency Injection** wires interfaces → implementations in each service's Nest module, so the
domain and application layers stay 100% framework-agnostic and unit-testable without a container.

---

## 6. Communication & Contracts

### Synchronous (Gateway ↔ Services) — TCP

Each service exposes typed message patterns. Contracts live in `@fardeen/types`:

```ts
// packages/types/src/contracts/project.contract.ts
export const PROJECT_PATTERNS = {
  list:   'project.list',
  getBySlug: 'project.getBySlug',
  create: 'project.create',
} as const;

export interface ProjectListQuery { category?: string; page: number; limit: number; }
export interface ProjectDto { id: string; slug: string; title: string; /* ... */ }
```

The gateway calls `client.send(PROJECT_PATTERNS.list, query)`; the service handles it with
`@MessagePattern(PROJECT_PATTERNS.list)`. Both sides import the same contract — a shape change is a
compile error, not a runtime surprise.

### Asynchronous (Events) — Redis pub/sub

Domain side effects are published as events and consumed out-of-band:

```
contact.submitted     → notification-service (email to sales + auto-reply)
quotation.requested   → notification-service, admin-service (dashboard counter)
quotation.statusChanged → notification-service (client update)
media.uploaded        → cms/project services (attach variants)
cms.published         → gateway (cache invalidation)
```

Events carry a `correlationId` and are versioned in `@fardeen/types/events`.

### Error model

Services return a discriminated `Result<T>` (`{ ok: true, data }` | `{ ok: false, error }`);
the gateway maps domain errors → HTTP status via a shared exception filter. No leaking stack traces.

---

## 7. Data Architecture

**Database-per-service** on one PostgreSQL instance (separate logical databases), each with its own
Prisma schema and generated client. This gives real ownership boundaries at near-zero dev cost.

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

**No cross-database joins.** When a view needs data from two contexts (e.g. a project referencing
media), the owning service stores a **reference id**, and composition happens at the gateway/BFF.

**Caching (Redis):** read-heavy public content (services list, published CMS sections, project
listings) is cached with explicit keys and invalidated by events (`cms.published`, etc.). Cache is a
performance layer, never a source of truth.

**Object storage (MinIO):** all binary assets. `media-service` issues **presigned upload/download
URLs** so bytes never transit the gateway. Stored: hero video, scene textures/GLBs, project galleries.

---

## 8. Security

- **Access tokens:** JWT signed **RS256** by auth-service (private key). Gateway verifies with the
  **public key locally** — no round-trip per request. Short TTL (~15 min).
- **Refresh tokens:** opaque, rotated on every use, stored server-side in Redis (revocable),
  delivered to the browser as `httpOnly`, `Secure`, `SameSite=Strict` cookie. Reuse detection
  invalidates the session family.
- **RBAC:** roles (`admin`, `editor`, `visitor`) encoded in the access token; gateway + service
  guards enforce per-route.
- **Edge hardening:** Helmet headers, strict CORS allowlist, global rate limiting + stricter limits
  on auth/contact/quotation endpoints, body-size caps, Zod validation on every inbound payload.
- **Secrets:** injected via env / Docker secrets — never committed. Keys mounted read-only.

---

## 9. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Config** | Zod-validated env schema per app; fails fast on boot if misconfigured |
| **Logging** | Structured JSON (pino), correlation-id propagated gateway → service → event |
| **Errors** | Shared global exception filter; typed domain errors → HTTP mapping |
| **Validation** | Zod at every boundary (HTTP body, message payload, env) |
| **Observability** | `/health` (liveness) + `/ready` (dependency checks) on every container |
| **Idempotency** | Contact/quotation writes accept an idempotency key to dedupe double-submits |
| **Migrations** | Prisma migrations per service, run on service startup in dev / as a job in prod |

---

## 10. Frontend Architecture (Feature-First)

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

**Rendering strategy:** static/RSC for content (SEO + speed); the cinematic canvas is a client
island lazy-loaded below the fold-safe hero. **Data:** RSC fetches through the gateway for initial
paint; TanStack Query hydrates client interactions (forms, admin). **Forms:** React Hook Form +
Zod resolver sharing schemas with the backend via `@fardeen/types`.

**Animation stack integration:**
- **Lenis** provides one smooth-scroll source of truth; its RAF drives **GSAP ScrollTrigger**
  (`ScrollTrigger.update` on Lenis scroll) so scroll and animation never desync.
- **GSAP + ScrollTrigger** is the scene director — a single pinned timeline scrubs Scenes 1–11.
- **R3F/Three.js** renders the 3D world; the timeline mutates camera/scene state via refs.
- **Framer Motion** handles component-level micro-interactions in DOM sections (12–15).
- **`prefers-reduced-motion`** yields a fully accessible static fallback path.

See [`CINEMATIC-STORYBOARD.md`](CINEMATIC-STORYBOARD.md) for the scene-by-scene technical plan.

---

## 11. Performance, SEO & Accessibility Strategy

- **SEO:** RSC-rendered content, per-route metadata API, JSON-LD (`Organization`, `Service`,
  `Project`), sitemap + robots, semantic headings, canonical URLs.
- **Assets:** `next/image` with AVIF/WebP; 3D models as compressed **glb (Draco/meshopt)** and
  **KTX2** textures; hero media as adaptive `HLS`/poster + preload.
- **Delivery:** route-level code splitting, dynamic import of the 3D bundle, `Suspense` boundaries,
  font subsetting with `next/font`.
- **Runtime budget:** target 60fps; instanced meshes, frustum culling, capped DPR, on-demand
  frameloop, texture atlases. Frame budget tracked per scene in the storyboard.
- **A11y:** keyboard-navigable, focus-visible, ARIA on interactive controls, reduced-motion fallback,
  AA+ contrast maintained even against the black/gold palette.
- **Target:** Lighthouse **95+** (Performance, SEO, Best Practices, Accessibility) on mid-range mobile.

---

## 12. Architecture Decision Records

Concise ADRs. Format: **Decision — Context — Consequence.**

**ADR-001 · Nx monorepo + pnpm.** One workspace for 10 apps + 5 libs. → Shared tooling, enforced
boundaries, affected-only builds/tests, atomic cross-cutting changes. Cost: single-repo CI discipline.

**ADR-002 · TCP for sync, Redis pub/sub for async.** Avoids a dedicated broker container while
keeping services isolated and side effects decoupled. → Leaner infra. Trade-off: Redis pub/sub is
at-most-once; the one durability-sensitive consumer (notifications) uses a Redis **Stream** with
consumer-group ack for retry. Upgrade path to RabbitMQ/NATS is localized to `packages/shared`.

**ADR-003 · Database-per-service.** True ownership, independent schema evolution, no hidden coupling.
→ Composition moves to gateway/BFF; eventual consistency across contexts is explicit, not accidental.

**ADR-004 · Local RS256 JWT verification at the gateway.** No auth round-trip per request. → Fast,
horizontally scalable. Refresh/revocation still centralized in auth-service + Redis.

**ADR-005 · Admin inside the frontend app.** Matches the single-`frontend` app requirement, shares
the design system, and is isolated by a protected route group + `admin-service` BFF. → Simpler
deploy than a separate app; guarded by middleware and server-side role checks.

**ADR-006 · Single pinned R3F canvas as scene director.** One WebGL context, one scrubbed GSAP
timeline for Scenes 1–11. → Predictable performance and camera continuity vs. many mounted canvases.

**ADR-007 · Contracts as a shared package.** `@fardeen/types` is imported by both sides of every
boundary. → Shape drift becomes a compile error; Zod guards the runtime edge.

---

## 13. Open Decisions (deferred, not blocking)

- **3D asset sourcing** (Phase 5/6): licensed/commissioned GLB models of the villa & construction
  stages vs. procedurally generated geometry vs. AI-generated placeholders. Affects the WebGL bundle
  and art direction — decided before Phase 6.
- **Email transport** for notification-service (SMTP vs. transactional API) — decided in Phase 4.
- **Prod hosting target** (containers on a VPS/K8s vs. managed) — decided before Phase 9.
