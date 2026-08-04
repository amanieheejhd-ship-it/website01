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

### Light dev mode (Windows, no Docker) — one persistent terminal

Docker/WSL2 is unavailable here, so infra runs **natively** (Postgres 5432 + Redis 6379, started by
`fardeen-dev-infra\start-infra.ps1`) and the services run as **compiled `dist`** (`node dist/main.js`,
~70 MB each) to stay light on memory. **Run the whole stack from one VS Code terminal — it stays live
until you close it:**

```powershell
.\dev-up.ps1            # ensure infra, build dist if needed, start 10 services + frontend, hold the terminal
.\dev-up.ps1 -Prod      # low-memory: serve the frontend as a production build (next start ~200MB, not next dev)
.\dev-up.ps1 -Rebuild   # force a fresh packages + services dist build first
```

`dev-up.ps1` streams a status line + the URLs and keeps the stack alive **exactly as long as this
terminal / VS Code is open**. Every child process lives in a Windows job object with
`KILL_ON_JOB_CLOSE`, so pressing **Ctrl+C** or **closing the terminal** stops all services cleanly —
no orphans. To clean up after a hard-closed terminal, from any terminal run `.\dev-down.ps1`.

- **Site:** http://localhost:3000 · **Admin:** http://localhost:3000/admin · **API:** http://localhost:4000/api/v1
- Admin logins: `admin@fardeen.local` / `Admin@12345` · `editor@fardeen.local` / `Editor@12345`

Each app reads [`.env.local`](.env.local) (git-ignored); compiled runs are bootstrapped by
`scripts/run-svc.cjs`, which loads the root + per-app `.env.local` before `node dist/main.js`.

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
