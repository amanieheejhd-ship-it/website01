# Fardeen — Complete Codebase Reference

> **Single source of truth for the entire Fardeen monorepo.** Deep-read of every file
> (11 apps + 5 packages + infra + docs), compiled into one document. Covers architecture,
> every service's Clean-Architecture layers, all contracts/events/message-patterns, the
> database schemas + seed data, Docker + native dev infra, and the current running state.
>
> **Project:** Fardeen — an ultra-premium, scroll-driven cinematic website for a full-solution
> construction company. A luxury villa rises from empty land as you scroll. Production-grade
> **Nx monorepo** (pnpm) with a **Next.js 15** frontend + a fleet of isolated **NestJS**
> microservices behind an **API gateway**, orchestrated with Docker (dev) / native binaries (light dev).
>
> **Repo:** `c:\Users\EARNINGFISH\fardeen-website` — `@fardeen/source`, private, UNLICENSED, pnpm@9.15.0, Node ≥20.

---

## 0. Phase status & what actually exists

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture & docs (ARCHITECTURE, DOMAIN-MODEL, API-CONTRACTS, CINEMATIC-STORYBOARD) | ✅ done |
| 2 | Nx scaffold (11 apps + 5 packages, tags, boundaries, React 18.3.1 pin) | ✅ done |
| 3 | Docker (dev + infra + prod compose, Dockerfiles, health/ready) | ✅ done |
| 4a | Contracts + Gateway foundation + Auth vertical | ✅ verified end-to-end |
| 4b-1 | cms / project / service-management services + gateway GET routes | ✅ verified |
| 4b-2 | contact / quotation / media services + gateway media resolution | ✅ verified |
| 4c-1 | Durable events (Redis Streams) + notification-service | ✅ code-complete, statically verified |
| — | **Native dev infra** (Docker/WSL dropped; portable Postgres 16.6 + Redis 7.4) | ✅ **current work — DB seeded & running** |
| 5 | Frontend cinematic scroll experience (Scenes 1–15) | ⬜ not started (page.tsx is a placeholder) |
| 6 | Cinematic animations · 7 Admin panel · 8 Testing · 9 Optimization | ⬜ not started |

**Business-logic maturity per app:**
- **Full Clean-Architecture verticals (domain+application+infrastructure+presentation, own DB):** auth, cms, project, service-management, contact, quotation, media.
- **notification-service:** full durable event consumer (Redis Streams) → email; owns `notification_db` (schema present, **no migrations dir** → materialized via `db push`).
- **admin-service:** health-only skeleton (Prisma removed, no DB, no message handlers). BFF/aggregator lands in Phase 7.
- **frontend:** Next.js 15 App-Router **scaffold placeholder** (static page). 3D/animation deps installed but unused until Phase 5.

**Counts:** 16 Nx projects (11 apps + 5 packages), ~346 source files (excl. generated/dist/node_modules).

---

## 1. Monorepo layout

```
fardeen-website/
├── apps/
│   ├── frontend/            Next.js 15 App Router (type:app-frontend) — scaffold
│   ├── gateway/             NestJS HTTP — the only public door (type:app-service)
│   ├── auth-service/        Identity & access — owns auth_db (reference vertical)
│   ├── cms-service/         Content/pages/testimonials — owns cms_db
│   ├── project-service/     Portfolio projects/categories — owns project_db
│   ├── service-management/  Service catalog (12 offerings) — owns service_db
│   ├── contact-service/     Contact submissions — owns contact_db
│   ├── quotation-service/   Quotation requests + line items — owns quotation_db
│   ├── media-service/       Asset metadata + MinIO presign — owns media_db
│   ├── notification-service/ Durable event consumer → email — owns notification_db
│   └── admin-service/       Health-only skeleton (no DB)
├── packages/
│   ├── types/     @fardeen/types  — cross-boundary contracts (type:types)
│   ├── shared/    @fardeen/shared — backend kernel (type:shared)
│   ├── utils/     @fardeen/utils  — pure helpers (type:utils)
│   ├── ui/        @fardeen/ui     — shadcn React components (type:ui)
│   └── config/    @fardeen/config — design tokens + presets (type:config)
├── infra/         Dockerfiles, postgres init, redis conf, minio + migrate scripts
├── docs/          ARCHITECTURE, DOMAIN-MODEL, API-CONTRACTS, CINEMATIC-STORYBOARD
├── secrets/       jwt-private.pem / jwt-public.pem (RS256, git-ignored)
├── docker-compose.yml            full dev stack (15 services)
├── docker-compose.infra.yml      light/infra-only (+ maildev)
├── docker-compose.prod.yml       production (minimal non-root images)
├── nx.json  tsconfig.base.json  eslint.config.mjs  package.json  pnpm-workspace.yaml  .npmrc
└── .env / .env.example / .env.local
```

Nx package globs: `apps/*`, `packages/*`. Path aliases (tsconfig.base.json):
`@fardeen/config|shared|types|ui|utils` → `packages/<name>/src/index.ts`.

---

## 2. Tooling & configuration

### package.json (root)
`packageManager: pnpm@9.15.0`; `engines: { node: ">=20", pnpm: ">=9" }`; private; **no root `dependencies`** (all runtime deps in per-app manifests).

**Scripts:** `build`=`nx run-many -t build` · `lint`=`nx run-many -t lint` · `test`=`nx run-many -t test` · `typecheck`=`tsc -p tsconfig.base.json --noEmit` · `format`/`format:check`=prettier · `graph`=`nx graph` · `dev:infra`=`docker compose -f docker-compose.infra.yml up -d` · `dev:infra:down` · `affected:build|test|lint`=`nx affected -t …`.

**Key devDeps:** `nx ^20.3.0` + `@nx/{eslint,eslint-plugin,jest,js,nest,next,react,webpack,workspace} ^20.3.0`, `@nestjs/cli ^10.4.9`, `@nestjs/schematics ^10.2.3`, `typescript ^5.6.3`, `eslint ^9.17.0`, `typescript-eslint ^8.19.0`, `prettier ^3.4.2`, `jest ^29.7.0`, `ts-jest ^29.2.5`, `ts-node ^10.9.2`, `tsconfig-paths ^4.2.0`, `@types/node ^20.17.10`.

**`pnpm.overrides` (load-bearing):** `react: 18.3.1`, `react-dom: 18.3.1` — pins ONE React instance (nested React 19 → `useContext` null crash; frozen-lockfile in Docker enforces it).

### nx.json
`defaultBase: main`. **namedInputs:** `default`=`[{projectRoot}/**/*, sharedGlobals]`; `production`=default minus specs/test/jest/eslint; `sharedGlobals`=`[tsconfig.base.json, nx.json, eslint.config.mjs]`.
**targetDefaults:** `build` dependsOn `^build`, cached, inputs `[production, ^production]`; `lint` cached; `test` cached; `@nx/js:tsc` dependsOn `^build`, cached.
**plugins:** `@nx/next`, `@nx/eslint` (targetName `lint`), `@nx/jest` (targetName `test`), `@nx/webpack`.

### tsconfig.base.json
`target ES2022`, `module esnext`, `moduleResolution node`, `lib [ES2022, DOM, DOM.Iterable]`, `types [node]`, `strict true`, `emitDecoratorMetadata + experimentalDecorators true` (Nest DI), `esModuleInterop`, `resolveJsonModule`, `importHelpers`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `noImplicitOverride/Returns`, `noFallthroughCasesInSwitch`; `noUnusedLocals/Parameters: false`. Excludes node_modules/tmp/dist/.next.

### .npmrc
`node-linker=hoisted`, `shamefully-hoist=true`, `strict-peer-dependencies=false`, `auto-install-peers=true`, `dedupe-peer-dependents=true`, `prefer-workspace-packages=true`, `link-workspace-packages=deep`, `save-workspace-protocol=rolling`, `engine-strict=true`.

### .prettierrc
`singleQuote`, `semi`, `trailingComma: all`, `printWidth 100`, `tabWidth 2`, `bracketSpacing`, `arrowParens: always`, `endOfLine lf`.

### ESLint module boundaries (eslint.config.mjs)
Flat config extending `@nx` base/typescript/javascript. `@nx/enforce-module-boundaries` = **error**, `enforceBuildableLibDependency: true`. **depConstraints (the dependency law):**

| sourceTag | may depend only on |
|---|---|
| `type:app-frontend` | ui, types, utils, config |
| `type:app-service` | shared, types, utils, config |
| `type:ui` | utils, config |
| `type:shared` | types, utils, config |
| `type:types` | config |
| `type:utils` | config |
| `type:config` | (leaf — nothing) |

→ A backend service can never import frontend code; apps can never import each other; domain/application layers can only reach types/shared/utils/config.
**Ignores:** `**/dist`, `**/.next`, `**/out-tsc`, `**/node_modules`, `**/coverage`, `**/.nx`, `**/generated/**`, `**/prisma/migrations/**`.

---

## 3. Environment variables & port map

`.env` (git-ignored) is **byte-identical to `.env.example`** — it's the docker-compose interpolation source. `.env.local` (git-ignored, Nx auto-loads per task) is the **native light-dev** file pointing every dependency at `localhost`. `.gitignore` protects: `.env`, `.env.*` (keeps `!.env.example`), `*.pem`, `*.key`, `secrets/`.

### .env / .env.example (docker interpolation)
`NODE_ENV=development`, `LOG_LEVEL=debug`; `POSTGRES_USER=fardeen`, `POSTGRES_PASSWORD=fardeen_dev_pw`, `POSTGRES_DB=fardeen`; `REDIS_PASSWORD=`(empty); `MINIO_ROOT_USER=fardeen`, `MINIO_ROOT_PASSWORD=fardeen_dev_pw`, `MINIO_BUCKET=fardeen-media`; `CORS_ALLOWED_ORIGINS=http://localhost:3000`; `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`; SMTP (empty host, port 587); `MAIL_FROM=Fardeen <no-reply@fardeen.example>`, `SALES_INBOX=sales@fardeen.example`; `JWT_ACCESS_TTL=900`, `JWT_REFRESH_TTL=1209600`, `JWT_ISSUER=fardeen-auth`, `JWT_AUDIENCE=fardeen-api`, `REFRESH_COOKIE_NAME=fardeen_rt`, `REFRESH_COOKIE_DOMAIN=localhost`.

### .env.local (NATIVE light-dev — current) — standard ports 5432/6379/9000
> Header: "Docker dropped: WSL2 engine unrecoverable — native infra on standard ports."

`POSTGRES_HOST=localhost` `POSTGRES_PORT=5432` `POSTGRES_USER=fardeen` `POSTGRES_PASSWORD=fardeen_dev_pw` `POSTGRES_DB=fardeen`; `REDIS_HOST=localhost` `REDIS_PORT=6379` `REDIS_URL=redis://localhost:6379`; `MINIO_ENDPOINT=localhost` `MINIO_PORT=9000` `MINIO_USE_SSL=false` `MINIO_ROOT_USER=fardeen` `MINIO_ROOT_PASSWORD=fardeen_dev_pw` `MINIO_BUCKET=fardeen-media`; `READY_CHECK_POSTGRES/REDIS/MINIO=true`; `GATEWAY_PORT=4000` `GATEWAY_GLOBAL_PREFIX=api/v1`; `JWT_PRIVATE_KEY_PATH=../../secrets/jwt-private.pem`, `JWT_PUBLIC_KEY_PATH=../../secrets/jwt-public.pem`, `JWT_ACCESS_TTL=900` `JWT_ISSUER=fardeen-auth` `JWT_AUDIENCE=fardeen-api`, `REFRESH_TTL_SECONDS=1209600`, `REFRESH_COOKIE_NAME=fardeen_rt`.

**Gateway → service host:port map** (`.env.local`): `AUTH_SERVICE_HOST/PORT=localhost/4010`, `CMS=…/4011`, `PROJECT=…/4012`, `SERVICE_MGMT=…/4013`, `CONTACT=…/4014`, `QUOTATION=…/4015`, `MEDIA=…/4016`.

**Per-service `DATABASE_URL`s** (all `postgresql://fardeen:fardeen_dev_pw@localhost:5432/<db>?schema=public`):
`AUTH_DATABASE_URL→auth_db`, `CMS_DATABASE_URL→cms_db`, `PROJECT_DATABASE_URL→project_db`, `SERVICE_DATABASE_URL→service_db`, `CONTACT_DATABASE_URL→contact_db`, `QUOTATION_DATABASE_URL→quotation_db`, `MEDIA_DATABASE_URL→media_db`, `NOTIFICATION_DATABASE_URL→notification_db`. (admin-service has none.)

### Per-app `.env.local` (each service)
Each app has its own `.env.local` (Nx auto-loads over root): sets `SERVICE_NAME`, `TCP_PORT`, `HTTP_PORT`. Values:

| App | SERVICE_NAME | TCP_PORT | HTTP_PORT | extra |
|---|---|---|---|---|
| auth-service | auth-service | 4010 | 3010 | |
| cms-service | cms-service | 4011 | 3011 | |
| project-service | project-service | 4012 | 3012 | |
| service-management | service-management | 4013 | 3013 | |
| contact-service | contact-service | 4014 | 3014 | |
| quotation-service | quotation-service | 4015 | 3015 | |
| media-service | media-service | 4016 | 3016 | MINIO_ENDPOINT/PORT/USE_SSL/ROOT_USER/ROOT_PASSWORD/BUCKET, MINIO_PUBLIC_URL (unused) |
| notification-service | notification-service | 4018 | 3018 | SMTP_HOST=localhost, SMTP_PORT=1025, MAIL_FROM, SALES_INBOX |

(admin-service `.env.local` if present would use 4017/3017.)

### Port map (native light-dev)

| Component | HTTP (health) | TCP (microservice) | DB |
|---|---|---|---|
| gateway | 4000 (`/api/v1/health`) | — | — |
| auth-service | 3010 | 4010 | auth_db |
| cms-service | 3011 | 4011 | cms_db |
| project-service | 3012 | 4012 | project_db |
| service-management | 3013 | 4013 | service_db |
| contact-service | 3014 | 4014 | contact_db |
| quotation-service | 3015 | 4015 | quotation_db |
| media-service | 3016 | 4016 | media_db |
| admin-service | 3017 | 4017 | — |
| notification-service | 3018 | 4018 | notification_db |
| frontend | 3000 (`/api/health`) | — | — |
| Postgres 5432 · Redis 6379 · MinIO 9000/9001 | | | |

---

## 4. Native dev infrastructure (Docker/WSL dropped)

Docker Desktop's WSL2 engine became unrecoverable on this machine, so dev infra now runs as **portable Windows binaries** (no admin, outside the repo). `docker-compose*.yml` are left untouched for prod/CI parity.

**Location:** `C:\Users\EARNINGFISH\fardeen-dev-infra\`
- `pg/pgsql/` — PostgreSQL 16.6 (EDB portable binaries)
- `redis/Redis-7.4.0-Windows-x64-msys2/` — Redis 7.4 (Streams-capable; `XPENDING IDLE` needs 6.2+, satisfied)
- `pgdata/` — initialized cluster (superuser `fardeen`, `--auth=trust`, UTF8, locale C)
- `start-infra.ps1` — reusable start script (below); logs `pg.err.log`, `redis.out.log`, etc.

**Critical Windows gotcha — `postgres.exe` child exits `0xC0000142` (DLL init failed):** the postmaster's forked children can't find the EDB-bundled DLLs unless `pg\pgsql\bin` is on `PATH`. Fix in `start-infra.ps1`: prepend bin to `$env:PATH` **before** launch, and launch `postgres.exe` **directly, detached** via `Start-Process -WindowStyle Hidden` (NOT `pg_ctl start`, which holds the shell pipe and hangs the launcher until timeout, which then kills the server).

**start-infra.ps1** (both detached, returns immediately):
```powershell
$root='C:\Users\EARNINGFISH\fardeen-dev-infra'; $bin="$root\pg\pgsql\bin"; $data="$root\pgdata"
$env:PATH="$bin;"+$env:PATH
Start-Process "$bin\postgres.exe" -ArgumentList '-D',$data,'-p','5432' -WindowStyle Hidden `
  -RedirectStandardOutput "$root\pg.out.log" -RedirectStandardError "$root\pg.err.log"
$rdir="$root\redis\Redis-7.4.0-Windows-x64-msys2"
Start-Process "$rdir\redis-server.exe" -ArgumentList '--port','6379' -WorkingDirectory $rdir -WindowStyle Hidden
```
Run: `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\EARNINGFISH\fardeen-dev-infra\start-infra.ps1`
Verify: `pg_isready -h localhost -p 5432` → *accepting connections*; `redis-cli -p 6379 ping` → *PONG*.

> **Both die on session/agent teardown** (detached processes are cleaned up when the launching shell tree is killed). Re-run `start-infra.ps1` to bring them back. MinIO + Maildev are **optional** for the light loop (media-resolver degrades gracefully — see §11 gateway).

**The 8 logical DBs** (created via `createdb -h localhost -p 5432 -U fardeen <db>`):
`auth_db cms_db project_db service_db contact_db quotation_db media_db notification_db`.
(Mirrors `infra/postgres/init/01-create-databases.sql`. admin-service owns none.)

**Migrations + seeds — ✅ ALL APPLIED (this session):**
```bash
# 7 services with migrations:
DATABASE_URL=<url> prisma migrate deploy --schema apps/<svc>/prisma/schema.prisma
# notification (no migrations dir):
DATABASE_URL=<url> prisma db push --schema apps/notification-service/prisma/schema.prisma
# seeds (read <SVC>_DATABASE_URL ?? DATABASE_URL; import apps/<svc>/generated/client):
DATABASE_URL=<url> TS_NODE_TRANSPILE_ONLY=1 TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' \
  node -r ts-node/register apps/<svc>/prisma/seed.ts
```
**Verified row counts:** `auth_db.users=1` (admin@fardeen.local / Admin@12345), `service_db.service_offerings=12`, `project_db.projects=7` (+ `categories=3`, incl `skyline-villa`), `cms_db` home page (4 sections) + 3 testimonials, `contact_db=2`, `quotation_db=2`, `media_db.assets=13`.

**No-Docker light loop verification target:** start `gateway + cms-service + project-service + service-management` via `pnpm nx dev <app>`, then
`curl http://localhost:4000/api/v1/services` → 12 offerings, and
`curl http://localhost:4000/api/v1/projects/skyline-villa` → the featured villa.

---

## 5. Docker (dev · infra · prod) & infra/ files

Three compose files on bridge network `fardeen-net`. Dev + infra share `name: fardeen` (same volumes); prod uses `name: fardeen-prod`.

**docker-compose.yml (DEV, 15 services)** — YAML anchors: `x-node-dev` (builds `infra/docker/node.Dockerfile` target `dev`, bind `.:/workspace` + named `workspace_node_modules` + anonymous shadows for `.nx`/`.next`); `x-svc-env` (`HTTP_PORT=3001`, `REDIS_URL=redis://redis:6379`, `POSTGRES_HOST=postgres`, `READY_CHECK_REDIS=true`, polling flags); `x-svc-healthcheck` (`node -e` GET `:3001/health`, 10s/retries 15/start 60s); `x-svc-depends` (postgres+redis healthy).
Services: **postgres** (`postgres:16-alpine`, 5432, init sql mount), **redis** (`redis:7-alpine`, 6379, appendonly+noeviction), **minio** (9000/9001), **createbuckets** (one-shot `mc mb` + anonymous download), **gateway** (4000, depends on all 10 services healthy), the **10 Nest services** (TCP 4010–4018, own DATABASE_URL), **frontend** (3000). admin depends **redis-only**; media depends minio + createbuckets completed. Volumes: postgres_data, redis_data, minio_data, workspace_node_modules.

**docker-compose.infra.yml (LIGHT/infra-only)** — `name: fardeen`. **Host ports shifted:** postgres `5435:5432`, redis `6381:6379`, minio `9002:9000`+`9003:9001`, **maildev** (`1025` SMTP, `1080` web). > Superseded by native infra (§4) which uses standard ports.

**docker-compose.prod.yml (PROD)** — `name: fardeen-prod`. Minimal non-root multi-stage images, no bind mounts, resource limits (cpus 0.75/mem 512M), healthcheck 15s/start 40s. Only gateway(4000)+frontend(3000) published. **migrate** one-shot under `profiles:[migrate]` → `infra/scripts/migrate.sh`.

**infra/ (7 files):** `docker/node.Dockerfile` (multi-stage base→deps→dev/build→prod-deploy→prod/tools; `deps` installs frozen-lockfile with React 18.3.1; `prod` non-root tini `node dist/main.js`); `docker/frontend.Dockerfile` (Next standalone, `node apps/frontend/server.js`); `postgres/Dockerfile` (16-alpine + baked init); `postgres/init/01-create-databases.sql` (8 DBs); `redis/redis.conf` (appendonly everysec, noeviction); `minio/create-buckets.sh`; `scripts/migrate.sh` (prod migrate per service, admin excluded).

**secrets/** (git-ignored): `jwt-private.pem` (auth signs), `jwt-public.pem` (gateway verifies — ADR-004).

---

## 6. Shared packages (`packages/`)

Dependency direction: `config` (leaf) ← `types`/`utils` ← `shared` (backend kernel) & `ui` (frontend). `@fardeen/types` is the cross-boundary contract SoT — a change there is a compile error on **both** producer and consumer.

| Package | name | tag | key deps | build |
|---|---|---|---|---|
| packages/types | @fardeen/types | type:types | zod ^3.24.1 | @nx/js:tsc |
| packages/shared | @fardeen/shared | type:shared | @fardeen/types+utils; peer @nestjs/common ^10.4.15, ioredis ^5.4.2, rxjs | @nx/js:tsc |
| packages/utils | @fardeen/utils | type:utils | (none) | @nx/js:tsc |
| packages/ui | @fardeen/ui | type:ui | @fardeen/utils, cva ^0.7.1, clsx ^2.1.1, tailwind-merge ^2.6.0; peer react 18\|19 | @nx/js:tsc |
| packages/config | @fardeen/config | type:config | peer tailwindcss ^3.4.17 | (typecheck only, no build) |

> Stray compiled `.js`+`.js.map` duplicates exist for some `types`/`shared` source files (build artifacts alongside `.ts`); `types/{auth,contracts,envelope}.ts` have none. Harmless.

### @fardeen/types — the contract catalog

**`envelope.ts` — response & internal Result:**
```ts
ApiMeta { requestId }                          PaginationMeta extends ApiMeta { page, limit, total }
ApiSuccess<T> { data: T; meta: ApiMeta }       ApiPaginated<T> { data: T[]; meta: PaginationMeta }
ApiErrorBody { error: { code, message, details? }; meta: ApiMeta }   // ← error envelope
Result<T,E=AppError> = { ok:true; data:T } | { ok:false; error:E }   // internal transport
AppError { code, message, details? }           helpers: ok(data), err(error)
```

**`contracts.ts` — TCP message patterns (`<context>.<action>` as-const) + DI tokens:**
- `AUTH_PATTERNS`: register `auth.register`, login `auth.login`, refresh `auth.refresh`, logout `auth.logout`, validate `auth.validate`, me `auth.me`
- `CMS_PATTERNS`: getPage `cms.getPage`, listTestimonials `cms.listTestimonials`, publishPage `cms.publishPage`
- `SERVICE_PATTERNS`: list `service.list`, getBySlug `service.getBySlug`, upsert `service.upsert`
- `PROJECT_PATTERNS`: list `project.list`, getBySlug `project.getBySlug`, listCategories `project.listCategories`, create `project.create`, update `project.update`, remove `project.remove`
- `CONTACT_PATTERNS`: submit `contact.submit`, list `contact.list`, setStatus `contact.setStatus`
- `QUOTATION_PATTERNS`: request `quotation.request`, get `quotation.get`, list `quotation.list`, setStatus `quotation.setStatus`
- `MEDIA_PATTERNS`: presignUpload `media.presignUpload`, get `media.get`, resolveMany `media.resolveMany`
- `SERVICE_CLIENTS` (ClientProxy DI token strings): `AUTH_CLIENT, CMS_CLIENT, PROJECT_CLIENT, SERVICE_CLIENT, CONTACT_CLIENT, QUOTATION_CLIENT, MEDIA_CLIENT, ADMIN_CLIENT`

**`events.ts` — Redis event envelope + channel names:**
```ts
DomainEvent<TData> { id; occurredAt; correlationId; version; name: EventName; data: TData }
EVENTS = { contactSubmitted:'contact.submitted', quotationRequested:'quotation.requested',
  quotationStatusChanged:'quotation.statusChanged', mediaUploaded:'media.uploaded',
  mediaReady:'media.ready', cmsPublished:'cms.published', projectPublished:'project.published',
  userRegistered:'user.registered', userRoleChanged:'user.roleChanged' }
```

**Domain DTOs & Zod (edge validation):**
- `auth.ts`: `Role='admin'|'editor'|'visitor'` (`ROLES`), `UserStatus='active'|'inactive'`; `registerSchema` (email≤254, password 8–128, role?), `loginSchema`; `UserProfile`, `AccessToken {accessToken,tokenType:'Bearer',expiresIn}`, `AccessTokenClaims {sub,email,role,type:'access'}`, Login/Refresh/Logout/Me payloads & results.
- `catalog.ts`: `ServiceOfferingDto {id,slug,name,tagline,description,icon,heroMediaId|null,order,active,features[],pricingTiers[]}`, `FeatureDto`, `PricingTierDto {priceFrom(minor units),currency,unit,inclusions[]}`; `upsertServiceSchema`.
- `projects.ts`: `ProjectStatus='draft'|'published'`; `CategoryDto`, `ProjectListItemDto`, `ProjectDto extends +{body,galleryMediaIds[]}`, `ProjectListResult`; `projectListQuerySchema` (category?, featured?, page≥1 def1, limit 1–50 def12), `createProjectSchema`.
- `cms.ts`: `PageStatus`, `SectionType='hero'|'scene'|'richText'|'gallery'|'cta'`; `PageDto {seo,sections[]}`, `SectionDto {type,order,payload,mediaRefs[]}`, `TestimonialDto`; `listTestimonialsQuerySchema`.
- `contact.ts`: `ContactStatus='new'|'read'|'archived'`; `ContactSubmissionDto`; `submitContactSchema` (name≤120, email, phone 5–24, subject≤160, message≤4000, source?); `ContactSubmittedData {contactId,email,subject}`.
- `quotation.ts`: `QuotationStatus='requested'|'reviewing'|'quoted'|'won'|'lost'`; `QuotationRequestDto {contact,serviceSlugs[],budgetRange|null,lineItems[],total,…}`; `requestQuotationSchema`; `QuotationRequestedData {quotationId,email}`, `QuotationStatusChangedData {quotationId,email,from,to}`.
- `media.ts`: `OwnerContext='cms'|'project'|'quotation'`, `AssetStatus='pending'|'ready'`; `MediaRefResolved {id,url|null,status,mime,variants[]}`; `presignUploadSchema`; `PresignUploadResult {assetId,bucket,objectKey,url,fields}`, `ResolveManyResult=Record<id,MediaRefResolved>`; `MediaUploadedData {assetId,ownerContext,objectKey}`.

### @fardeen/shared — backend kernel
- **`errors/domain-error.ts`** — `DomainError extends Error implements AppError` (`code`, `message`, `details?`, `toAppError()`; `name` = concrete subclass). Subclasses → codes: `NotFoundError(resource)`→`<RESOURCE>_NOT_FOUND`, `ValidationError`→`VALIDATION_ERROR`, `ConflictError`→`CONFLICT`, `UnauthorizedError`→`UNAUTHORIZED`, `ForbiddenError`→`FORBIDDEN`.
- **`ports/event-publisher.port.ts`** — `EVENT_PUBLISHER = Symbol`; `EventPublisher { publish<T>(event: DomainEvent<T>): Promise<void> }`.
- **`config/correlation.ts`** — `CORRELATION_ID_HEADER='x-correlation-id'`, `REQUEST_ID_HEADER='x-request-id'`.

### @fardeen/utils (pure, leaf)
`slugify(s)` (NFKD, strip diacritics, lowercase, non-alnum→`-`), `isDefined<T>` guard, `assertNever`, `clamp(v,min,max)`, `formatINR(amount)` (Intl en-IN, no decimals).

### @fardeen/ui
`cn(...)` = `twMerge(clsx(...))`; `Button` (forwardRef) + `buttonVariants` (cva) — variants `default`/`outline`/`ghost`, sizes `sm`/`md`/`lg`; gold focus ring. `ButtonProps` = native button attrs + variant/size.

### @fardeen/config (design tokens)
`tokens`: colors `background #0a0a0a`, `surface #141414`, `foreground #f5f5f4`, `muted #9ca3af`, `gold {DEFAULT #c8a15a, light #e5c987, dark #9a7736}`, `border rgba(200,161,90,.24)`; radius sm/md/lg/xl; font sans=[Inter,…], display=["Cormorant Garamond",…]. Exports: `.`→tokens, `./tailwind-preset`→`tailwind/preset.js` (mirror; omits `border` color), `./jest-preset`→`jest/preset.js` (ts-jest node preset, "wired in Phase 8").

---

## 7. Architecture & ADRs (docs/ARCHITECTURE.md)

**6 guiding principles:** (1) Isolation over convenience — every service owns its data, deploys independently, no cross-DB reach. (2) Clean Architecture everywhere — deps point inward; domain is framework/ORM/transport-independent. (3) Contracts are code (`@fardeen/types` + Zod at edges). (4) Gateway is the only public door. (5) DRY via shared packages. (6) Performance is a feature (Lighthouse 95+, frame budgets).

**Two communication planes:** **Sync** = Gateway→service over NestJS **TCP** transport with typed message patterns (reads + awaited commands). **Async** = services publish domain events to **Redis** (pub/sub for ephemeral + durable **Streams** for the notification consumer), carrying `correlationId`.

**Clean Architecture layers (per service):** `domain/` (entities, value-objects, events, repository *ports* — no framework imports) → `application/` (use-cases one-per-SRP, outbound ports, mappers, result util) → `infrastructure/` (prisma/redis/minio/config adapters implementing ports) → `presentation/` (`@MessagePattern` controllers over TCP) + `main.ts` (hybrid HTTP-health + TCP). The Nest module (`infrastructure/*.module.ts`) is the composition root — binds ports→adapters and builds use-cases via `useFactory` so domain/application never import Nest.

**Error model:** discriminated `Result<T>`; gateway maps domain `code`→HTTP via shared filter (no leaked stacks).

**The 7 ADRs:**
- **ADR-001 · Nx monorepo + pnpm** — one workspace → shared tooling, enforced boundaries, affected-only builds, atomic cross-cutting changes.
- **ADR-002 · TCP for sync, Redis for async** — no dedicated broker; pub/sub is at-most-once, so the durability-sensitive consumer (notifications) uses a Redis **Stream** with consumer-group ack + retry. Upgrade path to RabbitMQ/NATS localized to `@fardeen/shared`.
- **ADR-003 · Database-per-service** — true ownership, independent schema evolution; composition moves to gateway/BFF; eventual consistency explicit.
- **ADR-004 · Local RS256 JWT verification at the gateway** — no auth round-trip per request; refresh/revocation stays centralized in auth-service + Redis.
- **ADR-005 · Admin inside the frontend app** — single frontend, shared design system, isolated by protected route group + `admin-service` BFF.
- **ADR-006 · Single pinned R3F canvas as scene director** — one WebGL context, one scrubbed GSAP timeline for Scenes 1–11.
- **ADR-007 · Contracts as a shared package** — `@fardeen/types` on both sides of every boundary → drift = compile error; Zod guards runtime edge.

**Open decisions:** 3D asset sourcing (before Phase 6), email transport (Phase 4), prod hosting target (before Phase 9).

**Security posture:** RS256 access tokens (~15 min, gateway verifies public key locally); opaque rotating refresh tokens server-side in Redis (revocable, reuse-detection revokes family), httpOnly+Secure+SameSite=Strict cookie; RBAC `admin|editor|visitor`; Helmet, strict CORS allowlist, global + stricter auth/contact/quotation rate limits, Zod on every inbound; secrets via env, keys read-only.

---

## 8. Domain model (docs/DOMAIN-MODEL.md) — bounded contexts

Each context = one microservice owning its DB; cross-context links are **reference ids only** (no cross-DB joins). (AR) = aggregate root, ⚡ = emits event.

| Context (service / db) | Aggregates & key fields | Events | Invariants |
|---|---|---|---|
| **Identity** — auth-service (auth_db) | **User(AR)**: id, email(VO), passwordHash, role, status, createdAt — verifyPassword/changeRole/deactivate. **RefreshSession**: id, userId, tokenHash, familyId, userAgent, expiresAt, revokedAt | ⚡user.registered, ⚡user.roleChanged | one active credential per email; refresh reuse revokes whole family |
| **Content** — cms-service (cms_db) | **Page(AR)**: slug(VO), title, status, sections[], seo(VO). **Section**: type(hero/scene/richText/gallery/cta), order, payload(JSON), mediaRefs[]. **Testimonial(AR)**: author, role, company, quote, rating, avatarMediaId, featured | ⚡cms.published | only published pages public; section order unique per page |
| **Portfolio** — project-service (project_db) | **Project(AR)**: slug(VO), title, summary, body, categoryId, location, year, coverMediaId, galleryMediaIds[], status, featured, metrics(VO). **Category(AR)**: slug, name, order | ⚡project.published | slug unique; **featured ⇒ published AND has cover** |
| **Service Catalog** — service-management (service_db) — the **12 offerings** | **ServiceOffering(AR)**: slug(VO), name, tagline, description, icon, heroMediaId, features[], order, active. **Feature**. **PricingTier**: name, priceFrom(Money VO), unit, inclusions[] | — | slug unique; order = display sequence |
| **Contact** — contact-service (contact_db) | **ContactSubmission(AR)**: name, email(VO), phone(VO), subject, message, source, idempotencyKey, status(new/read/archived), createdAt | ⚡contact.submitted | duplicate idempotencyKey = no-op |
| **Quotation** — quotation-service (quotation_db) | **QuotationRequest(AR)**: contact(VO), serviceSlugs[], projectType, budgetRange(VO), timeline, details, attachments, status(requested→reviewing→quoted→won/lost), idempotencyKey. **QuoteLineItem**: label, qty, unitPrice(Money) | ⚡quotation.requested, ⚡quotation.statusChanged | status lifecycle enforced; total derived from line items |
| **Media** — media-service (media_db) | **Asset(AR)**: bucket, objectKey, mime, size, checksum, ownerContext, ownerId, variants[], status(pending/ready) | ⚡media.uploaded, (⚡media.ready declared, unused) | presigned PUT/GET; bytes bypass gateway |
| **Notifications** — notification-service (notification_db) | **Notification(AR)**: channel, template, to, payload, status(queued/sent/failed), attempts, correlationId. **ProcessedEvent**: correlationId (idempotency ledger) | consumes contact.submitted / quotation.requested / quotation.statusChanged | idempotent on correlationId |
| **Admin** — admin-service (no DB) | Pure BFF/aggregator (Phase 7) | — | holds no persistent state |

**Cross-context reference map:** Page.section.mediaRefs, Project.cover/galleryMediaIds, ServiceOffering.heroMediaId, Testimonial.avatarMediaId, Quotation.attachments → **media**; Quotation.serviceSlugs → **service-management** (by slug). Resolved at the gateway (public reads) — never cross-DB.

---

## 9. API Gateway (apps/gateway) — the only public door

NestJS HTTP app (`@fardeen/gateway`, tag `type:app-service`). RS256 JWT verified locally, RBAC, throttling, correlation-id, one TCP `ClientProxy` per bounded context, gateway-side media composition, global error/response envelopes.

**Bootstrap (main.ts):** `helmet()` → `cookieParser()` → `enableCors({origin: cfg.corsOrigins, credentials:true})` → `setGlobalPrefix('api/v1')` (**applies to health too**) → `useGlobalPipes(ValidationPipe {whitelist,transform})` → `enableShutdownHooks()` → `listen(4000)`. Global filter/interceptor/guard are registered as `APP_FILTER/INTERCEPTOR/GUARD` providers (not in main.ts).

**Config (config/env.ts, Zod, `GATEWAY_CONFIG` symbol):** `GATEWAY_PORT`(4000), `GATEWAY_GLOBAL_PREFIX`(api/v1), `CORS_ALLOWED_ORIGINS`(CSV), `JWT_PUBLIC_KEY` or `JWT_PUBLIC_KEY_PATH` (throws if neither), `JWT_ISSUER`(fardeen-auth), `JWT_AUDIENCE`(fardeen-api), `REFRESH_COOKIE_NAME`(fardeen_rt), `REFRESH_TTL_SECONDS`(14d), `RATE_LIMIT_TTL`(60), `RATE_LIMIT_MAX`(100), `AUTH_RATE_LIMIT_MAX`(10), `WRITE_RATE_LIMIT_MAX`(5). Service host:port map: auth 4010, cms 4011, project 4012, service 4013, contact 4014, quotation 4015, media 4016 (all localhost).

**App module:** `ThrottlerModule.forRoot([{ttl: RATE_LIMIT_TTL×1000, limit: RATE_LIMIT_MAX}])`; one `ClientProxy` per context (`ClientProxyFactory` TCP) under `SERVICE_CLIENTS.*` tokens; providers `MediaResolver`, `ClientsWarmup`, `JwtAuthGuard`, `RolesGuard`; global `APP_GUARD=ThrottlerGuard`, `APP_FILTER=AllExceptionsFilter`, `APP_INTERCEPTOR=ResponseEnvelopeInterceptor`; middleware `CorrelationIdMiddleware` on `*`.

**Cross-cutting (common/):**
- **AllExceptionsFilter** → `{ error:{code,message,details?}, meta:{requestId} }`. `DomainHttpError`→`statusForCode(code)`; `HttpException`→its status (+ `code` if present); else 500 `{code:'INTERNAL'}` + logs stack. **Never leaks stacks.**
- **ResponseEnvelopeInterceptor** → wraps returns as `{data, meta:{requestId}}`; **passes through** objects that already have `data`+`meta` (controllers building `{data, included:{media}, meta}` bypass wrapping).
- **CorrelationIdMiddleware** — reads/gens `x-correlation-id`, always gens fresh `requestId`; sets `req.correlationId/requestId`; echoes both headers. correlationId → downstream payloads; requestId → envelope meta.
- **ZodBody(schema)** pipe — `safeParse`; fail → `BadRequestException({code:'VALIDATION_ERROR', details: issues})` → 400.
- **callService(client, pattern, payload)** — `firstValueFrom(client.send<Result<T>>(...))`; `!ok`→throw `DomainHttpError(error)`; else `data`.
- **MediaResolver.resolveMany(ids)** — dedupes/drops falsy; empty→`{}`; else `callService(media, MEDIA_PATTERNS.resolveMany, {ids})`. **Graceful degradation:** wrapped `try {…} catch { return {}; }` → content/project/service reads succeed even if media-service/MinIO is down. Only place media ids → presigned URLs.
- **http-status.map:** `statusForCode` — VALIDATION_ERROR→400; INVALID_CREDENTIALS/UNAUTHORIZED/REFRESH_INVALID/REFRESH_REUSE→401; FORBIDDEN→403; EMAIL_TAKEN/CONFLICT→409; `*_NOT_FOUND`→404; default 400. `codeForStatus` reverse for generic HttpExceptions.

**Auth guards:** **JwtAuthGuard** — requires `Bearer`; `jwt.verify(token, publicKey, {algorithms:['RS256'], issuer, audience})` **locally** (ADR-004), attaches `req.user={sub,email,role,type}`. **RolesGuard** — `@Roles(...)` metadata; no user→401, role mismatch→403 `{code:'FORBIDDEN'}`; runs after JwtAuthGuard. **ClientsWarmup** — `onApplicationBootstrap` `Promise.allSettled` connects all 7 ClientProxies (avoids cold-start races).

**Full route table** (all under `/api/v1`):

| Method | Path | Guard/Roles | Validation | → pattern |
|---|---|---|---|---|
| POST | /auth/register | Jwt+Roles(admin) | registerSchema | auth.register |
| POST | /auth/login | — | loginSchema | auth.login → sets refresh cookie, returns AccessToken |
| POST | /auth/refresh | — | refresh cookie | auth.refresh → rotates cookie |
| POST | /auth/logout | — | refresh cookie | auth.logout → clears cookie |
| GET | /auth/me | Jwt | — | auth.me |
| GET | /services | — | — | service.list (resolves heroMediaId) |
| GET | /services/:slug | — | — | service.getBySlug |
| GET | /projects | — | projectListQuerySchema | project.list (resolves coverMediaId) |
| GET | /projects/categories | — | — | project.listCategories *(declared before :slug)* |
| GET | /projects/:slug | — | — | project.getBySlug (resolves cover+gallery) |
| GET | /pages/:slug | — | — | cms.getPage (resolves seo+section media) |
| GET | /testimonials | — | listTestimonialsQuerySchema | cms.listTestimonials |
| POST | /contact | class @Throttle 5/60s | submitContactSchema + **Idempotency-Key header** (else 400 IDEMPOTENCY_KEY_REQUIRED) | contact.submit |
| POST | /quotations | @Throttle 5/60s | requestQuotationSchema + **Idempotency-Key** | quotation.request |
| GET | /quotations/:id | Jwt+Roles(admin) | — | quotation.get |
| POST | /media/presign-upload | Jwt+Roles(editor,admin) | presignUploadSchema | media.presignUpload (direct-to-MinIO PUT url) |
| GET | /media/:id | — | — | media.get |
| GET | /health | — | — | liveness `{status:'ok',service,uptimeSeconds}` |
| GET | /ready | — | — | readiness TCP-probes pg/redis/minio (503 if down) |

AuthController is class-`@Throttle(10/60s)`. package deps: @nestjs/{common,core,microservices,platform-express} ^10.4.15, @nestjs/jwt, @nestjs/throttler, jsonwebtoken ^9 (local RS256), helmet ^8, cookie-parser, class-validator/transformer, zod.

---

## 10. Auth Service (apps/auth-service) — reference Clean-Architecture vertical

Owns `auth_db`. The canonical layering all services follow. Deps: bcryptjs ^2.4.3, jsonwebtoken ^9, ioredis, @prisma/client ^6.1.0.

**Database (prisma):**
- **User** → `users`: id(uuid PK), email(unique), passwordHash(`password_hash`), role(default `visitor`), status(default `active`), createdAt, updatedAt. (role/status are plain `String` in DB; TS-union enforced only in code.)
- **RefreshSession** → `refresh_sessions`: id, userId, tokenHash(unique), familyId, userAgent?, expiresAt, revokedAt?, createdAt; `@@index([userId])`,`@@index([familyId])`. **This durable table is the audit schema-of-record but is currently UNUSED at runtime — the live rotation store is Redis-only.** No FK to users.
- **Seed:** upserts admin `admin@fardeen.local` / `Admin@12345` (env-overridable), `bcrypt.hash(pw, 10)`, role `admin`. Idempotent on email (doesn't rewrite pw on re-seed).

**Hybrid bootstrap (main.ts):** `connectMicroservice({transport:TCP, host:SERVICE_BIND_HOST??'0.0.0.0', port:TCP_PORT})` + `startAllMicroservices()` + HTTP `listen(HTTP_PORT)`. Code fallbacks 4001/3001; `.env.local` pins 4010/3010.

**DI wiring (auth.module.ts)** — composition root, every port a Symbol token:
`AUTH_CONFIG`(loadConfig) · `PrismaService`(cfg.authDatabaseUrl) · `REDIS_CLIENT`(ioredis, maxRetriesPerRequest:null) · `USER_REPOSITORY`→PrismaUserRepository · `PASSWORD_HASHER`→BcryptPasswordHasher(rounds) · `TOKEN_SIGNER`→Rs256TokenSigner · `REFRESH_SESSION_STORE`→RedisRefreshSessionStore · `EVENT_PUBLISHER`→RedisEventPublisher · use-cases RegisterUser/LoginUser/RefreshToken/Logout/GetMe built via `useFactory` (framework-free classes).

**Domain:**
- **User (AR)** — `register()`/`rehydrate()` factories; `isActive()`, `verifyPassword(plain, compare)` (async, false if inactive, delegates to injected comparator so domain stays hash-lib-free), `changeRole()` (throws ForbiddenError if inactive), `deactivate()`.
- **RefreshSession** — `isActive(now)`, `revoke(now)` (idempotent). *(models the durable record; unused by use-cases currently.)*
- **Email VO** — normalizes trim+lowercase, regex validate, throws `ValidationError`.
- **auth-events.ts** — `UserRegisteredData {userId,email,role}`, `UserRoleChangedData`. Only `user.registered` is emitted.
- **UserRepository port** — findById, findByEmail(Email), existsByEmail(Email), save(User).

**Application ports:** `PasswordHasher {hash, compare}`; `TokenSigner {sign({id,email,role}): AccessToken}`; `RefreshSessionStore {issue, get, markRotated, revokeFamily}` (opaque tokens, hash-only, "rotation policy lives in the use-case"); `EventPublisher {publish}`. Mapper `toUserProfile`. `result.util.toErr(e)` — DomainError→`err(toAppError())`, else rethrow (→5xx).

**Use-cases:**
- **RegisterUser** — Email.create → existsByEmail guard (`EMAIL_TAKEN`) → hash → User.register → save → publish `user.registered` → `ok(profile)`.
- **LoginUser** — single `INVALID_CREDENTIALS` for unknown-email/bad-password/inactive (no enumeration); sign access + issue refresh (new family) → `ok({access, refreshToken, profile})`.
- **RefreshToken (rotation + reuse detection)** — `get(token)`: none→`REFRESH_INVALID`; **exists but `!active`→`revokeFamily` + `REFRESH_REUSE`**; expired→`REFRESH_INVALID`; else `markRotated` + verify user active (else revokeFamily+`UNAUTHORIZED`) + `issue(sameFamily)` → new access+refresh. Every refresh mints a new opaque token & invalidates the old; replay of a consumed token nukes the whole family.
- **Logout** — `get`→`revokeFamily`; always `ok({ok:true})` (idempotent).
- **GetMe** — findById→`USER_NOT_FOUND`|`ok(profile)`.

**Infrastructure:**
- **BcryptPasswordHasher** (bcryptjs, rounds from `BCRYPT_ROUNDS` def 10).
- **Rs256TokenSigner** — `jwt.sign({email, role, type:'access'}, privateKey, {algorithm:'RS256', subject:id, expiresIn: ttl, issuer, audience})`. Claims: `sub`=user id, `email`, `role`, `type:'access'`, `iss/aud/exp/iat`; TTL `JWT_ACCESS_TTL` def **900s**. Access tokens are JWTs; **refresh tokens are NOT JWTs**. No `auth.validate` handler (gateway verifies locally).
- **RedisRefreshSessionStore** — `hash=SHA-256 hex` (only hash stored, never raw); keys `auth:rt:tok:<hash>`, family set `auth:rt:fam:<familyId>`. `issue`: `randomBytes(32) hex` opaque token, TTL = refreshTtl+60s grace, adds hash to family set. `markRotated`: sets `active=false` but KEEPS the record (TTL preserved) → enables reuse detection. `revokeFamily`: hard-deletes every token in the family set + the set.
- **RedisEventPublisher (dual-write, ADR-002)** — envelope `{id, occurredAt, correlationId: input.correlationId ?? randomUUID(), version:1, name, data}` → `xadd('stream:'+name,'*','event',json)` **then** `publish(name, json)`. Non-transactional.

**Message patterns:** `auth.register→RegisterUser`, `auth.login→LoginUser`, `auth.refresh→RefreshToken`, `auth.logout→Logout`, `auth.me→GetMe`. (`auth.validate` declared, not implemented.)

---

## 11. Catalog / Portfolio / Content services

All three: Clean Architecture, own DB, hybrid bootstrap, identical health controller, `type:app-service`, 4 Nx targets (build/serve/typecheck/dev). Domain/application import only `@fardeen/{shared,types,utils}`+`node:crypto`.

### Service-Management (apps/service-management) — service_db · TCP 4013
**No Redis / no events** (read/upsert catalog only; loads redis env but wires no client).
- **Prisma:** `ServiceOffering`→`service_offerings` (id, slug unique, name, tagline, description, icon, heroMediaId, order, active, timestamps); `Feature`→`features` (offeringId FK cascade, title, description, order); `PricingTier`→`pricing_tiers` (offeringId FK cascade, name, priceFrom(Int minor units), currency, unit, inclusions String[]).
- **Seed (12 offerings, idempotent by slug, order 0–11, each +2 features, no pricing tiers):** `home-construction, aluminium-work, glass-work, acp-cladding, false-ceiling, modular-kitchen, interior-design, exterior-design, steel-fabrication, railings, renovation, commercial-projects`.
- **Domain:** ServiceOffering AR; `Money.of(amount, currency='INR')` (ValidationError if not finite/<0); `Slug.create` (slugify).
- **Use-cases:** `ListServices` (repo.listActive, always ok); `GetServiceBySlug` (`SERVICE_NOT_FOUND`); `UpsertService` (admin/seed — Money.of, upsertBySlug replaces features/tiers).
- **Repo:** `listActive` (active:true, order asc, include features/tiers), `findBySlug`, `upsertBySlug` (full replace of children).
- **Patterns:** `service.list→ListServices`, `service.getBySlug→GetServiceBySlug`, `service.upsert→UpsertService`.

### Project Service (apps/project-service) — project_db · TCP 4012
**Has Redis dual-write publisher.**
- **Prisma:** `Category`→`categories` (slug unique, name, order); `Project`→`projects` (id, slug unique, title, summary, body, categoryId FK **RESTRICT**, location, year, coverMediaId?, galleryMediaIds String[], status default `draft`, featured, metricsArea?, metricsDurationMonths?, timestamps; `@@index category_id/status/featured`).
- **Seed:** 3 categories (`home-construction`/`interior`/`commercial`) + **7 projects (6 published + 1 draft)**:
  - **`skyline-villa`** ⭐ — Skyline Villa, home-construction, published, **featured**, 2024 Hyderabad, cover present
  - `courtyard-house` (Pune), `glass-pavilion` (Bengaluru), `penthouse-interior` (interior, featured, Mumbai), `modular-kitchen-suite` (interior, Chennai), `corporate-hq` (commercial, Gurugram) — all published
  - `retail-flagship` — commercial, **draft**, cover=null
- **Domain:** Project AR — invariant (`create()` only): **featured ⇒ published AND coverMediaId** else ValidationError. `isPublished()`. Category AR. Slug VO. `ProjectPublishedData {projectId,slug,title}`.
- **Use-cases:** `ListProjects` (filter: default published unless includeUnpublished, category, featured; orderBy featured/year/createdAt; paginated); `GetProjectBySlug` (`PROJECT_NOT_FOUND`); `ListCategories`; `CreateProject` (`PROJECT_SLUG_TAKEN`/`CATEGORY_NOT_FOUND`; publishes `project.published` if published); `UpdateProject` (publishes only on draft→published transition); `RemoveProject`.
- **Patterns:** `project.list/getBySlug/listCategories/create/update/remove`.

### CMS Service (apps/cms-service) — cms_db · TCP 4011
**Has Redis dual-write publisher.** 3 models (Page + Section + Testimonial).
- **Prisma:** `Page`→`pages` (slug unique, title, status default `draft`, seoTitle, seoDescription, seoOgImageMediaId?, timestamps); `Section`→`sections` (pageId FK cascade, type, order, **payload Json/JSONB**, mediaRefs String[]; `@@unique([pageId,order])`); `Testimonial`→`testimonials` (author, role, company, quote, rating def 5, avatarMediaId?, featured, createdAt).
- **Seed:** `home` page (published, SEO set) + 4 sections (order 0 hero → `media-hero-video`, 1 scene → `media-villa-glb`, 2 richText, 3 cta) + 3 testimonials (Ravi Menon⭐, Anita Rao⭐, Sameer Khan).
- **Domain:** Page AR — `publish()` mutates status; `sections` getter returns copy sorted by order. Testimonial AR (rehydrate only). Slug VO. `CmsPublishedData {pageId,slug}`.
- **Use-cases:** `GetPage` (`PAGE_NOT_FOUND`); `ListTestimonials` (featured filter); `PublishPage` (findBySlug incl unpublished → publish → save → emit `cms.published`).
- **Patterns:** `cms.getPage/listTestimonials/publishPage`.

---

## 12. Contact / Quotation / Media services

All three: Clean Architecture, own DB, Redis dual-write publisher, hybrid bootstrap. `type:app-service`.

### Contact Service (apps/contact-service) — contact_db · TCP 4014
- **Prisma:** `ContactSubmission`→`contact_submissions` (id, name, email, phone, subject, message, source def `website`, idempotencyKey **unique**, status def `new`, createdAt; `@@index status`). Idempotency key unique = double-submit guard.
- **VOs:** `Email.create` (trim/lowercase/regex); `Phone.create` (strip to digits+`+`, require ≥7 digits).
- **Entity:** `markRead()` (new→read), `archive()`, `setStatus()`.
- **Seed:** 2 rows — Priya Sharma (new), Arjun Nair (read).
- **Use-cases:** `SubmitContact` (idempotency via findByIdempotencyKey → returns existing w/o event; else save + **emit `contact.submitted`**); `ListContacts` (page/limit); `SetContactStatus` (`CONTACT_NOT_FOUND`, **no event**).
- **Event `contact.submitted`:** data `{contactId, email, subject}`.
- **Patterns:** `contact.submit/list/setStatus`.

### Quotation Service (apps/quotation-service) — quotation_db · TCP 4015
- **Prisma:** `QuotationRequest`→`quotation_requests` (contactName/Email/Phone, serviceSlugs String[], projectType, budgetMin?/budgetMax?/budgetCurrency?, timeline, details, attachments String[], status def `requested`, idempotencyKey unique, createdAt; `@@index status`); `QuoteLineItem`→`quote_line_items` (quotationId FK cascade, label, qty def 1, unitPrice Int, currency).
- **VOs:** `BudgetRange.of(min,max,currency)` (ValidationError if min<0/max<min); `Money.of`; `QuoteContact.create({name,email,phone})`.
- **Entity — status lifecycle `TRANSITIONS`:** requested→[reviewing,lost], reviewing→[quoted,lost], quoted→[won,lost], won→[], lost→[]. `changeStatus(next)`: same=no-op, invalid→ValidationError. `total` = Σ qty×unitPrice.
- **Seed:** 2 quotes — Kavya Reddy (requested, villa 5M–8M) and Imran Ali (quoted, 2 line items, total 390000).
- **Use-cases:** `RequestQuotation` (idempotent; **emit `quotation.requested`**); `GetQuotation` (`QUOTATION_NOT_FOUND`); `ListQuotations`; `SetQuotationStatus` (changeStatus; **emit `quotation.statusChanged` only if from≠to**).
- **Events:** `quotation.requested` data `{quotationId, email}`; **`quotation.statusChanged`** (wire string is camelCase `quotation.statusChanged`, NOT `status-changed`) data `{quotationId, email, from, to}`.
- **Patterns:** `quotation.request/get/list/setStatus`.

### Media Service (apps/media-service) — media_db · TCP 4016
Extra dep: `minio ^8.0.3`.
- **Prisma:** `Asset`→`assets` (id, bucket, objectKey, mime, size def 0, checksum def '', ownerContext, ownerId?, **variants Json/JSONB def `[]`**, status def `pending`, createdAt; `@@index ownerContext`). No idempotency key.
- **Entity:** `AssetVariant {kind, objectKey}`; `markReady()` (pending→ready, returns true only on that transition).
- **Ports:** `AssetRepository {findById, findManyByIds, save}`; **`MediaStore {bucket, presignPut, presignGet, exists}`**.
- **MinioMediaStore:** wraps `minio.Client`; `ensureBucket()` at DI init; `presignPut/Get` default expiry **3600s**; bytes never pass through the service.
- **Seed:** **13 asset metadata rows** (no bytes uploaded), ids matching project/cms media refs so gateway `resolveMany` composition resolves — e.g. `media-skyline-cover`, `skyline-villa-gal-1/2`, `media-hero-video`, `media-villa-glb`, `media-og-home`, `media-avatar-ravi/anita`, etc. All `status:ready`, one `thumb` variant each.
- **Use-cases:** `PresignUpload` (create pending Asset + presigned PUT url); `GetAsset` (`ASSET_NOT_FOUND`; **lazy confirm**: if `store.exists` & `markReady()` → save + emit `media.uploaded` once; presign GET url + variants); `ResolveMany` (dedupe ids, presign GET per asset+variant, **omits missing ids**, no events — the gateway MediaResolver path).
- **Event `media.uploaded`** (from GetAsset only): data `{assetId, ownerContext, objectKey}`. `media.ready` declared but unused.
- **Env (MinIO):** `MINIO_ENDPOINT`(localhost), `MINIO_PORT`(9000), `MINIO_USE_SSL`, `MINIO_ROOT_USER`(fardeen), `MINIO_ROOT_PASSWORD`(required), `MINIO_BUCKET`(fardeen-media). `MINIO_PUBLIC_URL` in .env.local is unused (not in schema).
- **Patterns:** `media.presignUpload/get/resolveMany`.

---

## 13. Notification Service (apps/notification-service) — durable event consumer

Owns `notification_db`. Consumes domain events off **Redis Streams** (durable, consumer-group) → emails via **Nodemailer**. Dep: `nodemailer ^6.9.16`. **No migrations dir** (schema materialized via `db push`).

- **Prisma:** `Notification`→`notifications` (id, channel, template, to(`to_addr`), payload Json, status def `queued`, attempts def 0, correlationId, createdAt; `@@index correlationId/status`) — delivery log; `ProcessedEvent`→`processed_events` (correlationId PK, processedAt) — durable idempotency ledger.
- **Bootstrap:** hybrid (TCP transport wired but ingestion is via Redis Streams, not @MessagePattern; TCP 4018 / HTTP 3018). `import 'reflect-metadata'` first.
- **DI (notification.module.ts):** APP_CONFIG, PrismaService, `NOTIFICATION_REPOSITORY`→PrismaNotificationRepository, `EMAIL_SENDER`→NodemailerEmailSender, 3 handlers, and **`StreamConsumer` (eager provider — its `onApplicationBootstrap` starts the loops)**. Dispatch map: `contact.submitted→HandleContactSubmitted`, `quotation.requested→HandleQuotationRequested`, `quotation.statusChanged→HandleQuotationStatusChanged`.

**StreamConsumer (stream-consumer.ts) — the durable engine:**
- Two ioredis connections (`maxRetriesPerRequest:null`): `reader` (blocking XREADGROUP) + `control` (XGROUP/XACK/XPENDING/XCLAIM). Stream key = `stream:<eventName>`.
- **Bootstrap:** per stream `XGROUP CREATE stream group '0' MKSTREAM` (idempotent — swallows only `BUSYGROUP`). Starts readLoop + reclaimLoop.
- **readLoop:** `XREADGROUP GROUP g consumer COUNT batch BLOCK blockMs STREAMS … '>'` (new msgs), long-polls; per message → `handle()`.
- **handle:** parse `event` field; **missing field / bad JSON / unknown event → XACK & drop** (poison-safe); else `handler(event)` then **XACK on success**; on throw → **no ack** (stays in PEL for reclaim).
- **reclaimLoop:** every `reclaimIdleMs`, `XPENDING … IDLE reclaimIdleMs - + 20`; if `deliveries > maxAttempts` → **dead-letter (XACK/drop, no separate DLQ stream)** + warn; else `XCLAIM min-idle 0` → re-`handle`.
- **Guarantees:** **at-least-once** (ack only after handler success → handlers must be idempotent); **durable across downtime** (messages XADD'd while consumer is DOWN are delivered on restart — pub/sub would lose them); bounded retries; per-stream sequential ordering.

**Handlers (each: `if isProcessed(correlationId) return;` → send email(s) via `deliverEmail` → `markProcessed`):**
- `HandleContactSubmitted` — sends 2 emails: `contact-sales`→salesInbox + `contact-autoreply`→submitter.
- `HandleQuotationRequested` — `quotation-sales`→salesInbox.
- `HandleQuotationStatusChanged` — `quotation-status`→**the client's email** (from/to).
- **Idempotency:** `ProcessedEvent` ledger = at-most-once per correlationId **after a successful completion**; but `deliverEmail` runs before `markProcessed`, so a mid-handler failure can re-send already-sent emails on retry (event-granularity, not per-email). `markProcessed` uses upsert (itself idempotent). Each send writes a `Notification` row (attempts→1, markSent/markFailed).

- **NodemailerEmailSender:** `createTransport({host, port, secure:false, auth?, tls:{rejectUnauthorized:false}})` — suits Maildev (SMTP 1025) in dev. `send({to,subject,text,html?})`.
- **Env:** `NOTIFICATION_DATABASE_URL` (required), REDIS_*, `SMTP_HOST`(localhost)/`SMTP_PORT`(1025)/user/pass, `MAIL_FROM`, `SALES_INBOX`, `NOTIFICATION_GROUP`(notification), `NOTIFICATION_CONSUMER`(notification-1), `NOTIFICATION_MAX_ATTEMPTS`(5), `NOTIFICATION_RECLAIM_IDLE_MS`(15000), `NOTIFICATION_BLOCK_MS`(5000), `NOTIFICATION_BATCH`(10).

---

## 14. Admin Service & Frontend

### Admin Service (apps/admin-service) — health-only skeleton
No DB (Prisma removed), no domain, 3 source files. `app.module` imports nothing but `HealthController`. Same hybrid `main.ts` (minus `reflect-metadata` import) + identical health controller. `dev` target uses `nest start --watch` (others use ts-node). No Prisma/nodemailer deps. Clean-Architecture layers + BFF aggregation land in Phase 7. `type:app-service`, TCP 4017.

### Frontend (apps/frontend) — Next.js 15 App Router (scaffold)
`type:app-frontend`. **Next 15.1.3, React 18.3.1** (pinned exact). Installed-but-unused (staged for Phase 5): `@react-three/fiber`, `@react-three/drei`, `three`, `framer-motion`, `gsap`, `lenis`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`. Workspace: `@fardeen/{config,types,ui,utils}`.
- **next.config.mjs:** `reactStrictMode`, `output:'standalone'`, `transpilePackages:[ui,types,utils,config]`, `images.formats:[avif,webp]`, `experimental.optimizePackageImports:[ui]`.
- **tailwind.config.ts:** extends `@fardeen/config/tailwind-preset`; content globs app + `packages/ui/src`.
- **src/app:** `layout.tsx` (metadata "Fardeen — Cinematic Construction Experience", `<html className="dark">`); **`page.tsx` = static placeholder** ("Phase 5 mounts the cinematic scroll experience here… This is the Phase 2 scaffold") with a `<Button>` from `@fardeen/ui`; `globals.css` (Tailwind v3 layers, tokens from preset); `api/health/route.ts` (`{data:{status:'ok',service:'frontend',uptimeSeconds}, meta:{requestId}}`).
- **project.json:** only `typecheck` + `dev` (`next dev -H 0.0.0.0 -p 3000`) targets — **no build/serve** (prod build via standalone Docker image). `public/` = only `.gitkeep`.

---

## 15. Events catalog (Redis) — producers → consumers

Dual-write per publisher: `xadd('stream:'+name,'*','event',json)` + `publish(name, json)`. Envelope `{id, occurredAt, correlationId, version:1, name, data}`.

| Event (channel = `stream:<name>`) | Producer | Payload data | Consumer |
|---|---|---|---|
| `contact.submitted` | contact-service (SubmitContact) | {contactId, email, subject} | notification-service |
| `quotation.requested` | quotation-service (RequestQuotation) | {quotationId, email} | notification-service |
| `quotation.statusChanged` | quotation-service (SetQuotationStatus, on transition) | {quotationId, email, from, to} | notification-service |
| `project.published` | project-service (Create/Update on publish) | {projectId, slug, title} | *(none yet — Phase 4c-2 cache invalidation)* |
| `cms.published` | cms-service (PublishPage) | {pageId, slug} | *(none yet)* |
| `media.uploaded` | media-service (GetAsset lazy-confirm) | {assetId, ownerContext, objectKey} | *(none yet)* |
| `media.ready` | *declared, not emitted* | — | — |
| `user.registered` | auth-service (RegisterUser) | {userId, email, role} | *(none yet)* |
| `user.roleChanged` | *declared, not emitted* | — | — |

> **Redis token cosmetic bug:** every service declares `REDIS_CLIENT = Symbol('AUTH_REDIS_CLIENT')` (copy-paste label; harmless — Symbols are identity-based).

---

## 16. Message-pattern catalog (all TCP patterns)

Every handler returns `Result<T>`; gateway unwraps via `callService`. `<context>.<action>`, constants in `@fardeen/types/contracts.ts`.

| Service | Patterns |
|---|---|
| auth (4010) | auth.register · auth.login · auth.refresh · auth.logout · auth.me *(auth.validate declared, unimplemented)* |
| cms (4011) | cms.getPage · cms.listTestimonials · cms.publishPage |
| project (4012) | project.list · project.getBySlug · project.listCategories · project.create · project.update · project.remove |
| service-management (4013) | service.list · service.getBySlug · service.upsert |
| contact (4014) | contact.submit · contact.list · contact.setStatus |
| quotation (4015) | quotation.request · quotation.get · quotation.list · quotation.setStatus |
| media (4016) | media.presignUpload · media.get · media.resolveMany |

---

## 17. Cinematic storyboard (docs/CINEMATIC-STORYBOARD.md) — the Phase 5/6 vision

Single scroll-driven narrative: empty land → finished luxury villa → services/projects/testimonials/contact. **Scroll IS the timeline.** One pinned R3F `<Canvas>` hosts Scenes 1–11 (WebGL), pinned via a tall scroll-spacer; scroll 0→1 scrubs one GSAP timeline. **Lenis** is the only scroll authority (its RAF drives `ScrollTrigger.update()`); the timeline mutates refs (camera/material/transform) so React never re-renders on scroll (60fps). `prefers-reduced-motion` → single hero still + static sections.

**Scenes 1–11 (pinned WebGL, scrubbed):** 1 Empty Land (Dawn), 2 Foundation, 3 Structure Rises, 4 **Transformation to Luxury Villa** (signature hero moment), 5 Approach & Gate, 6 Living Room, 7 Kitchen, 8 Bedroom, 9 Bathroom, 10 Terrace, 11 **Complete Villa Reveal** (canvas unpins here → hands off to DOM).
**Scenes 12–15 (DOM, Framer Motion):** 12 Services (12 glassmorphic cards ← `GET /services`), 13 Projects (← `GET /projects`), 14 Testimonials (← `GET /testimonials?featured=true`), 15 Contact (RHF+Zod → `POST /contact` / `/quotations`).

**Reusable primitives (Phase 6):** `useLenis()`, `useSceneProgress(range)`, `useReducedMotion()`, `<ScrollScene>`, `<RevealText>`, `<MagneticCard>`; three primitives `<InstancedGrass>`, `<Birds>`, `<GrowMesh>`, `<Gate>`, `<CameraRig>`.
**Perf budget:** 60fps desktop / ≥30fps mobile; draw calls <150 (instancing); WebGL bundle (gz) <800 KB (dynamic-imported below hero); GLB Draco/meshopt + KTX2 + LOD; DPR capped min(dpr,2); LCP <2.5s (hero paints without WebGL).

---

## 18. How to run (native, no Docker)

```powershell
# 1. Start infra (Postgres 5432 + Redis 6379), detached
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\EARNINGFISH\fardeen-dev-infra\start-infra.ps1
# verify: pg_isready -h localhost -p 5432   |   redis-cli -p 6379 ping
```
```bash
# 2. (once, or after data reset) migrations + seeds — see §4 (idempotent)
# 3. Start apps natively (each reads its .env.local; separate terminals or background):
pnpm nx dev gateway            # :4000
pnpm nx dev cms-service        # :4011 tcp / :3011 http
pnpm nx dev project-service    # :4012 / :3012
pnpm nx dev service-management # :4013 / :3013
# (+ auth/contact/quotation/media/notification/frontend as needed)
# 4. Smoke test (public REST):
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/services            # → 12 offerings
curl http://localhost:4000/api/v1/projects/skyline-villa   # → featured villa
```
**Notes:** services use `node --watch -r ts-node/register src/main.ts` (ts-node transpileOnly) because they import `@fardeen/*` TS sources directly. Media resolution degrades to `{}` if media-service/MinIO are down, so the GET loop works without them. Full stack (when Docker is available): `docker compose up`.

**Seeded credentials (dev only):** admin `admin@fardeen.local` / `Admin@12345`. Postgres `fardeen` / `fardeen_dev_pw` (trust auth locally). All in git-ignored `.env.local`; never committed.

---

## 19. Verified facts & caveats

1. **React single instance** — `pnpm.overrides` pins react/react-dom 18.3.1; nested React 19 caused `useContext` null. Frozen-lockfile in Docker enforces it.
2. **ts-node dev runner** — `@fardeen`-importing services run via `node --watch -r ts-node/register` (transpileOnly). `nest build` also works. Avoid leaking `TS_NODE_PROJECT` into `nx dev` launches (breaks tsconfig resolution).
3. **bcryptjs** (pure JS, no native build) chosen over bcrypt/argon2 for cost 10 hashing.
4. **Refresh tokens** — opaque `randomBytes(32)` hex, stored **SHA-256-hashed** in Redis; only access tokens are JWTs (RS256, 15-min). The `refresh_sessions` Postgres table + `RefreshSession` entity exist but are **unused at runtime** (Redis is the live store; DB reserved for audit phase).
5. **auth.validate** pattern declared but not implemented — gateway verifies access tokens locally (ADR-004).
6. **Event dual-write** is non-transactional (stream `xadd` then pubsub `publish`).
7. **notification-service has no migrations dir** — schema is materialized via `prisma db push`.
8. **admin-service** is a health-only skeleton (no DB, no handlers).
9. **frontend page.tsx** is a static placeholder; the cinematic experience is Phase 5.
10. **`REDIS_CLIENT = Symbol('AUTH_REDIS_CLIENT')`** label is a harmless copy-paste artifact across all services.
11. **Native infra dies on session/agent teardown** — re-run `start-infra.ps1`.
12. **Windows `postgres.exe` child `0xC0000142`** — fixed by putting `pg\pgsql\bin` on PATH before launch (see §4).
13. **docker-compose.infra.yml** still maps shifted host ports (5435/6381/9002/9003) + maildev; the native infra uses standard ports — kept for prod/CI parity, untouched.
14. **service-management emits NO events** (no Redis client wired), unlike project/cms/contact/quotation/media/auth.

---

## 20. Roadmap / what's next

- [x] 1 Architecture · [x] 2 Nx scaffold · [x] 3 Docker · [x] 4a Auth+Gateway · [x] 4b cms/project/service/contact/quotation/media · [x] 4c-1 durable events+notification · [x] native dev infra (DB seeded & running)
- [ ] **4c-2** — wire remaining event consumers (cache invalidation on cms.published / project.published)
- [ ] **5** — Frontend cinematic scroll shell (Scenes 1–15), replace page.tsx placeholder, wire TanStack Query → gateway
- [ ] **6** — Cinematic animations (R3F/GSAP/Lenis, 3D asset sourcing decision)
- [ ] **7** — Admin panel (admin-service BFF + protected route group)
- [ ] **8** — Testing (jest preset already staged in @fardeen/config)
- [ ] **9** — Optimization (Lighthouse 95+, perf budget)

**Immediate next actionable:** finish the native no-Docker verification (boot gateway + cms + project + service-management, confirm the two curls return seeded data), then begin Phase 5.

---

*Compiled from a full deep-read of every file across 11 apps + 5 packages + infra + docs. Companion narrative/architecture doc: `MASTER-REFERENCE.md`.*
