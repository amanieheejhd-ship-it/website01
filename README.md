# Fardeen — Cinematic Construction Experience

> An ultra-premium, story-driven website for a full-solution construction company.
> Not a website — an interactive cinematic experience that builds a luxury villa from empty
> land as the user scrolls.

This is a production-grade **Nx monorepo**: a Next.js 15 cinematic frontend backed by a fleet
of isolated **NestJS microservices** behind an API gateway, orchestrated entirely with Docker.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, GSAP + ScrollTrigger, Lenis, React Three Fiber, Three.js, TanStack Query, Zod, React Hook Form |
| **Backend** | NestJS (TypeScript), REST via API Gateway, TCP + Redis microservice transport |
| **Architecture** | Nx Monorepo, Domain-Driven Design, Clean Architecture, SOLID, Feature-First |
| **Database** | PostgreSQL + Prisma ORM (database-per-service) |
| **Cache / Bus** | Redis (cache + pub/sub event bus) |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | JWT access tokens (RS256) + rotating refresh tokens |
| **Infra** | Docker + Docker Compose (dev & prod), health checks, hot reload |
| **Package Manager** | pnpm workspaces |

---

## Monorepo Layout

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

---

## Development Roadmap

The build proceeds **phase by phase**. Each phase ends at a confirmation gate.

- [x] **Phase 1 — Architecture**
- [x] **Phase 2 — Nx Monorepo scaffold** (apps, packages, tooling, absolute imports)
- [x] **Phase 3 — Docker** (dev + prod compose, volumes, networks, health checks, hot reload) ← _you are here_
- [ ] **Phase 4 — Backend** (services, Prisma schemas, gateway, auth, contracts)
- [ ] **Phase 5 — Frontend shell** (design system, layout, routing, data layer)
- [ ] **Phase 6 — Cinematic animations** (R3F scenes, GSAP/ScrollTrigger, Lenis)
- [ ] **Phase 7 — Admin panel**
- [ ] **Phase 8 — Testing** (unit, integration, e2e)
- [ ] **Phase 9 — Optimization** (Lighthouse 95+, SEO, a11y, asset budgets)

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full system architecture & decision records
- [`docs/DOMAIN-MODEL.md`](docs/DOMAIN-MODEL.md) — bounded contexts and aggregates
- [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) — REST surface + internal message patterns
- [`docs/CINEMATIC-STORYBOARD.md`](docs/CINEMATIC-STORYBOARD.md) — Scenes 1–15 technical breakdown

---

## Quick Start

One command boots the entire platform — frontend, gateway, all 9 microservices, Postgres
(with the 8 per-service databases), Redis, and MinIO (bucket created), wired on the
`fardeen-net` network with health-gated boot order.

```bash
cp .env.example .env        # then edit secrets
docker compose up           # (add -d to run detached)
```

- **Frontend:** http://localhost:3000
- **Gateway (REST):** http://localhost:4000/api/v1/health → `{ "data": { "status": "ok", ... } }`
- **MinIO console:** http://localhost:9001

### Light dev mode (low-resource machines)

Running every app in Docker is heavy on Windows/WSL2. Instead, run **only the infra in Docker**
(Postgres + Redis + MinIO) and the **Node apps natively** on the host via Nx:

```bash
pnpm dev:infra              # start Postgres + Redis + MinIO (docker-compose.infra.yml)
pnpm nx dev gateway        # run just the app(s) you need, natively
pnpm nx dev frontend       #   → connect to the Dockerized infra on localhost
pnpm nx dev auth-service   #   (start any subset of the 9 services)
pnpm dev:infra:down        # stop the infra when done
```

Natively-run apps read [`.env.local`](.env.local) (git-ignored, auto-loaded by Nx), which points
`POSTGRES_HOST`/`REDIS_HOST`/`MINIO_ENDPOINT` at `localhost`; the health dependency hosts also
default to `localhost` in dev. The full `docker compose up` above remains the parity/CI path.

**Health model.** Every container has a health check. The gateway and frontend expose real
HTTP liveness/readiness routes; each Nest microservice runs a small HTTP server (`/health`,
`/ready`) alongside its TCP transport, so `depends_on: condition: service_healthy` sequences the
whole stack. `/ready` TCP-probes the dependencies that container needs (Postgres/Redis/MinIO).

**Hot reload.** The repo is bind-mounted; `node_modules` lives in a named volume so the host
mount never clobbers container-installed deps. File watching uses polling for Windows/WSL2
(`WATCHPACK_POLLING`, `CHOKIDAR_USEPOLLING`, and Nest tsconfig `watchOptions`).

**Production topology.**

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# one-shot migrations (real schemas land in Phase 4):
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

Prod uses minimal, non-root, multi-stage images (prod deps only; frontend via Next
`output: 'standalone'`), no bind mounts, restart policies, resource limits, and publishes only
the gateway and frontend. See [`infra/`](infra/) for Dockerfiles and platform config.
