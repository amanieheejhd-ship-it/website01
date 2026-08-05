# Fardeen — Complete Codebase Reference

> A single, exhaustive, deep-read reference for the entire Fardeen monorepo. Every app, package,
> layer, contract, route, database, test, dev script, and the photoreal cinematic engine is
> documented here. Generated 2026-08-05 from a file-by-file read of the whole repository.

**Repo root:** `c:\Users\EARNINGFISH\fardeen-website` · **Package manager:** pnpm 9 · **Node ≥ 20** · **Nx 20** monorepo.

---

## 0. Overview & architecture at a glance

**What Fardeen is.** An ultra-premium, scroll-driven cinematic website for a full-solution
construction company, built as a production-grade **Nx monorepo**: a **Next.js 15** frontend (public
marketing site + a protected admin panel) in front of a **fleet of isolated NestJS microservices**
behind one **API gateway**. The homepage runs a scroll-scrubbed **raw three.js** cinematic (Scenes
1–11) that was upgraded to photoreal (HDRI IBL + PBR + shadows + post-processing + real GLB furniture).

**The stack.**
- **Frontend:** Next.js 15.1.3 (App Router, RSC), React 18.3, Tailwind (ink+gold design tokens),
  TanStack Query, React Hook Form + Zod, Framer Motion; the cinematic layer is raw three.js 0.171 +
  GSAP + Lenis.
- **Backend:** 1 API gateway + 9 NestJS microservices (auth, cms, project, service-management,
  contact, quotation, media, admin, notification). Sync calls over **NestJS TCP** (`@MessagePattern`);
  async domain events over **Redis** (dual-write Stream + pub/sub).
- **Data:** **database-per-service** (one Postgres instance, 8 logical DBs; admin-service has none),
  **MinIO** (S3) for media bytes, **Redis** for refresh sessions + event streams + cache.
- **Contracts:** `@fardeen/types` is imported by both sides — drift is a compile error; Zod guards
  runtime at the gateway edge.

**Clean Architecture (per service).** Four layers, dependencies point inward only:
`domain/` (entities + value objects + repository ports — pure) → `application/` (use-cases + ports +
mappers — pure) → `infrastructure/` (Prisma/Redis/MinIO adapters, config, DI composition root) →
`presentation/` (`@MessagePattern` controllers + health). Use-cases receive plain interfaces (Symbol
DI tokens) and return a discriminated `Result<T> = {ok:true;data} | {ok:false;error:AppError}`. The
gateway unwraps `Result`, maps error `code` → HTTP status, and wraps everything in an envelope.

**Module-boundary rules (enforced by ESLint `@nx/enforce-module-boundaries`).** `type:*` tags gate
imports: frontend → {ui, types, utils, config}; app-service → {shared, types, utils, config}; ui →
{utils, config}; shared → {types, utils, config}; types → {config}; utils → {config}; config → leaf.
Backend never imports frontend; apps never import each other; violations fail `nx lint`.

**Key architectural decisions (ADRs, in `docs/ARCHITECTURE.md §12`).**
- **ADR-001** Nx monorepo + pnpm. · **ADR-002** TCP (sync) + Redis pub/sub + durable **Streams** (async).
- **ADR-003** Database-per-service (composition at the gateway/BFF; explicit eventual consistency).
- **ADR-004** Gateway verifies RS256 access tokens **locally** (no auth round-trip); refresh/revocation
  centralized in auth-service + Redis.
- **ADR-005** Admin lives **inside** the frontend app (protected route group + `admin-service` BFF;
  server-side session, tokens never in client JS).
- **ADR-006** One pinned canvas as the scene director (one WebGL context, one scrubbed GSAP timeline).
- **ADR-007** Contracts as a shared package.

**Cross-cutting patterns you will see everywhere.**
- **Envelope:** success `{data, meta:{requestId}}` (+ `included:{media}` and `meta:{page,limit,total}`
  where relevant); error `{error:{code,message,details?}, meta}`.
- **Events:** every domain event is a `DomainEvent<T>{id,occurredAt,correlationId,version,name,data}`
  dual-written to `stream:<name>` (XADD, durable, consumer-group) and `<name>` (PUBLISH, ephemeral).
- **Idempotency:** contact/quotation submits carry an `Idempotency-Key`; notification-service keeps a
  `ProcessedEvent` ledger keyed by `correlationId`.
- **Money** is stored as integer minor units (paise) everywhere.
- **Correlation id** flows request → service → event via `x-correlation-id` / `x-request-id` headers.

**Phase history (how the codebase was built).** P1–4 scaffolding + infra + per-service domains/DBs;
**P5** frontend shell (design system + routing + data + forms, no 3D); **P6a** cinematic scene
director + procedural WebGL Scenes 1–11; **P6b** DOM-section motion + perf/Lighthouse pass; **P7a**
admin-service BFF + gateway `/admin` routes; **P7b** admin UI (protected route group, server-side
session, RBAC); **P8a** unit tests (~293, ≥85/90% coverage); **P8b-1** integration tests vs native
Postgres+Redis (no Docker); **P8b-2** Playwright e2e + persistent `dev-up.ps1`; then a **cinematic
realism upgrade** (HDRI + PBR + shadows + post + real GLB furniture).

**Run it (Windows, no Docker).** Native Postgres 5432 + Redis 6379 (start via
`C:\Users\EARNINGFISH\fardeen-dev-infra\start-infra.ps1`); then in a VS Code terminal:
`.\dev-up.ps1 -Prod` (holds the whole stack live, job-object kill-on-close). Site → `localhost:3000`,
admin → `localhost:3000/admin` (`admin@fardeen.local` / `Admin@12345`), API → `localhost:4000/api/v1`.
MinIO isn't staged, so **media-service stays down** (uploads unavailable; everything else works).

### Table of contents
1. **Monorepo, tooling & packages** — root config, docs/ADRs, `@fardeen/{types,shared,config,ui,utils}`.
2. **Gateway & auth-service** — the public door + identity/JWT/refresh core.
3. **project-service, quotation-service, service-management** — portfolio, quotations, service catalog.
4. **contact-service, cms-service, media-service, notification-service** — enquiries, CMS, media/MinIO, event consumer.
5. **Frontend — public site & cinematic engine** — app shell, marketing routes, components/forms, data layer, the photoreal three.js engine.
6. **Admin panel, testing & dev/infra** — session/proxy/RBAC + screens, unit/integration/e2e, dev-up/ports.
7. **Appendix** — event catalog, service quick-reference, key file index.

---

## 1. Monorepo, tooling & packages

Fardeen is a **feature-first Nx monorepo** (`@fardeen/source`, private, `UNLICENSED`). Package manager is **pnpm 9.15.0** (`packageManager` pin); engines require **Node ≥20, pnpm ≥9** (`.npmrc` `engine-strict=true`). Workspace globs (`pnpm-workspace.yaml`): `apps/*` and `packages/*`.

### 1.1 Root configuration

#### `package.json` (root)
`@fardeen/source` · `0.0.0` · `private`. **Scripts:**

| Script | Command | Purpose |
|---|---|---|
| `build` / `lint` / `test` | `nx run-many -t <target>` | All projects |
| `typecheck` | `tsc -p tsconfig.base.json --noEmit` | Whole-workspace typecheck |
| `format` / `format:check` | `prettier --write .` / `--check .` | Formatting |
| `graph` | `nx graph` | Dependency graph |
| `dev:infra` / `dev:infra:down` | `docker compose -f docker-compose.infra.yml up -d` / `down` | Postgres+Redis+MinIO only |
| `affected:build/test/lint` | `nx affected -t <target>` | Affected-only |
| `test:integration` | `jest --config jest.integration.config.js --runInBand` | Integration vs native PG/Redis |
| `test:integration:setup` | `bash scripts/setup-integration-dbs.sh` | Create `*_test` DBs |

devDeps: Nx 20.3 tool belt, `@nestjs/cli`, `@playwright/test` 1.62, Testing Library, Jest 29 + ts-jest, ESLint 9 + typescript-eslint 8, TS 5.6, ts-node, prettier 3.4. **pnpm.overrides pins react/react-dom to 18.3.1.**

#### `nx.json`
namedInputs `default`/`production`/`sharedGlobals`. targetDefaults: `build` `dependsOn:["^build"]` cached; `lint`/`test` cached (`test` input includes `jest.preset.js`); `@nx/js:tsc` cached. plugins: `@nx/next`, `@nx/eslint`, `@nx/jest`, `@nx/webpack`. `defaultBase:"main"` (current branch is `master`).

#### `tsconfig.base.json`
`target ES2022`, `module esnext`, `moduleResolution node`, `strict`, `noImplicitOverride/Returns`, `noFallthroughCasesInSwitch`, decorators on, `esModuleInterop`, `resolveJsonModule`, `sourceMap`, `skipLibCheck`. **paths:** `@fardeen/{config,shared,types,ui,utils}` → `packages/*/src/index.ts`.

#### ESLint (`eslint.config.mjs`, flat)
Heart = **`@nx/enforce-module-boundaries`** (error) via `depConstraints` on `type:*` tags:

| sourceTag | onlyDependOnLibsWithTags |
|---|---|
| `type:app-frontend` | ui, types, utils, config |
| `type:app-service` | shared, types, utils, config |
| `type:ui` | utils, config |
| `type:shared` | types, utils, config |
| `type:types` / `type:utils` | config |
| `type:config` | (leaf) |

#### Other root config
- **`.prettierrc`:** singleQuote, semi, `trailingComma:all`, `printWidth:100`, tabWidth 2, LF.
- **`.npmrc`:** `node-linker=hoisted`, `shamefully-hoist`, `auto-install-peers`, `prefer-workspace-packages`, `link-workspace-packages=deep`, `engine-strict`.
- **`.gitignore`:** node_modules, `.nx/cache`, dist/`.next`, Prisma `**/generated/`, coverage, all `.env*` **except `.env.example`**, `*.pem`/`secrets/`, dev/e2e artifacts (`.dev-logs/`, `.dev-pids`, `e2e-report/`, `test-results/`), cinematic binaries `apps/frontend/public/cinematic/**` (keeps `SOURCES.md`).
- **`jest.preset.js`:** re-export of `packages/config/jest/preset.js`.
- **`jest.integration.config.js`:** displayName `integration`, matches `apps/**/*.integration.spec.ts`, ts-jest `tsconfig.integration.json`, maps `@fardeen/*` to source, `testTimeout 30000`, **`maxWorkers:1`**.
- **`playwright.config.ts`:** `testDir ./e2e`, **1 worker**, timeout 45s, `baseURL http://localhost:3000`, trace/screenshot/video on failure, chromium. Drives the **already-running** native stack.
- **Docker compose (3):** `docker-compose.yml` (full dev, one shared image, hot reload, health-gated boot), `docker-compose.infra.yml` (infra-only, host ports shifted, `name: fardeen`), `docker-compose.prod.yml` (per-app non-root prod images, only gateway+frontend published, migrations one-shot).

#### Environment variables (`.env.example` template; names only)
`NODE_ENV`/`LOG_LEVEL`; `POSTGRES_USER/PASSWORD/DB`; `REDIS_PASSWORD`; `MINIO_ROOT_USER/PASSWORD/BUCKET`; `CORS_ALLOWED_ORIGINS`; `NEXT_PUBLIC_SITE_URL/API_BASE_URL`; SMTP block (`SMTP_HOST/PORT/USER/PASSWORD`, `MAIL_FROM`, `SALES_INBOX`); JWT (`JWT_ACCESS_TTL/REFRESH_TTL/ISSUER/AUDIENCE`); `REFRESH_COOKIE_NAME/DOMAIN`. Reference-only (usually unset): `HTTP_PORT`, `TCP_PORT` (4010–4018), `GATEWAY_PORT=4000`, `GATEWAY_GLOBAL_PREFIX=api/v1`, `PORT=3000`, `READY_CHECK_*`, per-service `DATABASE_URL`. **`.env.local`** (git-ignored, native dev) adds `POSTGRES_HOST/PORT`, `REDIS_HOST/PORT/URL`, `MINIO_*`, `JWT_PRIVATE/PUBLIC_KEY_PATH`, per-service `*_SERVICE_HOST/PORT`, and per-service `*_DATABASE_URL`.

### 1.2 Documentation & ADRs
`docs/` = 4 docs (ADRs inline in ARCHITECTURE §12). **`ARCHITECTURE.md`** — structure/boundaries/communication + the 7 ADRs (001 Nx+pnpm; 002 TCP+Redis+durable Streams; 003 DB-per-service; 004 local RS256 verify at gateway; 005 admin inside frontend + BFF; 006 single canvas director; 007 shared contracts) + deferred decisions (3D assets, email transport, prod hosting). **`DOMAIN-MODEL.md`** — bounded contexts, aggregates/VOs/events per service + cross-context reference map. **`API-CONTRACTS.md`** — public REST + TCP patterns + envelope/status mapping + governance. **`CINEMATIC-STORYBOARD.md`** — 11 canvas scenes + DOM sections 12–15 + performance budget.

### 1.3 `packages/*` (all `type:*` tagged; build to `dist/packages/<name>` except config)

#### `@fardeen/types` — `type:types`
The single source of truth for cross-boundary shapes. `main: ./dist/index.js`, dep `zod`. Barrels: envelope, contracts, events, auth, catalog, projects, cms, contact, quotation, media, admin.
- **Envelope + Result:** `ApiMeta{requestId}`, `PaginationMeta`, `ApiSuccess/Paginated/ErrorBody`, `AppError{code,message,details?}`, `Result<T,E=AppError> = {ok:true;data} | {ok:false;error}`, ctors `ok()`/`err()`.
- **Pattern consts (`contracts.ts`, `as const`):** `AUTH_PATTERNS`(register,login,refresh,logout,validate,me), `CMS_PATTERNS`(getPage,listTestimonials,publishPage,listPages,updatePage), `SERVICE_PATTERNS`(list,getBySlug,upsert,listAll), `PROJECT_PATTERNS`(list,getBySlug,getById,listCategories,create,update,remove), `CONTACT_PATTERNS`(submit,list,setStatus), `QUOTATION_PATTERNS`(request,get,list,setStatus,stats), `MEDIA_PATTERNS`(presignUpload,get,resolveMany), `ADMIN_PATTERNS`(dashboard, projects.*, services.*, pages.*, contacts.*, quotations.*), `SERVICE_CLIENTS` (auth→`AUTH_CLIENT` … admin→`ADMIN_CLIENT`).
- **Events:** `EVENTS` (contact.submitted, quotation.requested, quotation.statusChanged, media.uploaded, media.ready, cms.published, project.published, user.registered, user.roleChanged), `DomainEvent<T>{id,occurredAt,correlationId,version,name,data}`.
- **Enums:** `Role` admin|editor|visitor; `PageStatus`/`ProjectStatus` draft|published; `SectionType` hero|scene|richText|gallery|cta; `ContactStatus` new|read|archived; `QuotationStatus` requested|reviewing|quoted|won|lost; `OwnerContext` cms|project|quotation; `AssetStatus` pending|ready.
- **Schemas/DTOs:** `registerSchema`/`loginSchema`, `updatePageSchema`, `upsertServiceSchema`, `projectListQuerySchema`/`createProjectSchema`, `submitContactSchema`, `requestQuotationSchema`, `presignUploadSchema`; DTOs `UserProfile`, `AccessToken`, `AccessTokenClaims{sub,email,role,type:'access'}`, `PageDto`/`SectionDto`/`SeoDto`/`TestimonialDto`/`AdminPageListItem`, `ServiceOfferingDto`/`FeatureDto`/`PricingTierDto`, `ProjectDto`/`ProjectListItemDto`/`ProjectListResult`/`CategoryDto`, `ContactSubmissionDto`, `QuotationRequestDto`/`QuoteContact`/`BudgetRange`/`QuoteLineItemDto`/`QuotationStats`, `MediaRefResolved`/`ResolveManyResult`/`PresignUploadResult`, `DashboardCounters`.

#### `@fardeen/shared` — `type:shared` (backend kernel)
- **`errors/domain-error.ts`:** `DomainError extends Error implements AppError` (`toAppError()`); `NotFoundError`→`<X>_NOT_FOUND`, `ValidationError`→`VALIDATION_ERROR`, `ConflictError`→`CONFLICT`, `UnauthorizedError`→`UNAUTHORIZED`, `ForbiddenError`→`FORBIDDEN`.
- **`ports/event-publisher.port.ts`:** `EVENT_PUBLISHER` Symbol + `EventPublisher.publish<T>(DomainEvent<T>)`.
- **`config/correlation.ts`:** `CORRELATION_ID_HEADER='x-correlation-id'`, `REQUEST_ID_HEADER='x-request-id'`.

#### `@fardeen/config` — `type:config` (leaf)
`exports`: `.`, `./tailwind-preset`, `./jest-preset`. `tokens.ts` (ink+gold palette, radii, fonts). `tailwind/preset.js`. `jest/preset.js` (node, ts-jest isolatedModules, excludes integration specs, maps `@fardeen/*` to source).

#### `@fardeen/ui` — `type:ui`
`cn = twMerge(clsx(...))`. Components (forwardRef + CVA): `Button`(+`buttonVariants`), `Container`, `Section`, `Surface`(+`surfaceVariants`), `Card/CardBody/CardTitle/CardMeta`, `Badge`(+`badgeVariants`), `Input`(+`fieldBase`), `Textarea`, `FormField` (render-prop, a11y wiring), `Eyebrow/Heading`(+`headingVariants`)`/Lead/Prose`.

#### `@fardeen/utils` — `type:utils` (leaf)
`slugify`, `isDefined<T>`, `assertNever`, `clamp`, `formatINR` (Intl en-IN, 0 fraction).

---

## 2. Gateway & auth-service

### 2.1 Gateway
The **only public HTTP door**. Verifies RS256 tokens locally (ADR-004), enforces RBAC, rate-limits, correlation ids, resolves media refs, translates HTTP ⇄ TCP.

**Bootstrap (`main.ts`):** `helmet()`, `cookieParser()`, `enableCors({origin:cfg.corsOrigins, credentials:true})`, `setGlobalPrefix('api/v1')`, `ValidationPipe({whitelist,transform})`, listen **4000**.
**Module:** `ThrottlerModule` (100/60s default); 9 controllers; 8 `ClientProxy` providers (`SERVICE_CLIENTS.*` → TCP); `MediaResolver`/`ClientsWarmup`/`JwtAuthGuard`/`RolesGuard`; global `ThrottlerGuard`/`AllExceptionsFilter`/`ResponseEnvelopeInterceptor`; `CorrelationIdMiddleware` on `*`. **Jwt/RolesGuard are opt-in per route.**
**Config (`GATEWAY_CONFIG`):** `GATEWAY_PORT`(4000), prefix(api/v1), CORS, `JWT_PUBLIC_KEY`/`_PATH` (throws if neither), issuer/audience, per-service `*_SERVICE_HOST/PORT` (4010–4017), `REFRESH_COOKIE_NAME`(fardeen_rt), `REFRESH_TTL_SECONDS`(14d), rate limits (global 100, auth 10, write 5).
**Auth:** `JwtAuthGuard` (Bearer → `jwt.verify(RS256, issuer, audience)` → `req.user`; 401 UNAUTHENTICATED/UNAUTHORIZED). `RolesGuard` (`@Roles` via `getAllAndOverride([handler,class])`; 401/403 FORBIDDEN).
**Common:** `callService<T>` (throws `DomainHttpError` on `!ok`). `http-status.map` (`statusForCode`/`codeForStatus`). `ResponseEnvelopeInterceptor` (`{data, meta:{requestId}}` unless already enveloped). `AllExceptionsFilter` (`{error, meta}`; unknown → 500 INTERNAL, stack logged not leaked). `CorrelationIdMiddleware`. `ClientsWarmup` (allSettled connect). `MediaResolver.resolveMany` (**returns `{}` on any error**). `ZodBody` pipe. `FardeenRequest`.

**Routes (under `/api/v1`):** auth (`register` admin-only, `login`/`refresh`/`logout` public 10/60s, `me` Jwt); public reads `services`/`services/:slug`, `projects`/`projects/categories`/`projects/:slug`, `pages/:slug`, `testimonials`; public writes `contact`/`quotations` (5/60s + `Idempotency-Key`); `quotations/:id` (admin); media `presign-upload` (editor/admin) + `media/:id`; **`/admin/*` BFF** (dashboard, projects list/get/create/update, **DELETE admin-only**, services list/upsert, pages list/get/update/publish, contacts list/setStatus, quotations list/get/setStatus — all admin/editor); `health`/`ready`. Refresh cookie: `httpOnly, secure:isProd, sameSite:'strict', path:'/api/v1/auth', maxAge:14d`.

### 2.2 auth-service (`auth_db`; TCP 4010 / HTTP 3010)
**Domain:** `User` (`register` role default visitor; `verifyPassword` false if inactive; `changeRole` throws ForbiddenError if inactive; `deactivate`). `RefreshSession` (hash only). `Email` VO. Ports `USER_REPOSITORY`.
**Application:** `RegisterUser` (`EMAIL_TAKEN` guard + emit `user.registered`), `LoginUser` (single `INVALID_CREDENTIALS`), `RefreshToken` (**rotation + reuse detection → `revokeFamily` + `REFRESH_REUSE`**; expired → `REFRESH_INVALID`), `Logout` (idempotent), `GetMe`.
**Infrastructure:** config (`AUTH_DATABASE_URL`, `JWT_PRIVATE_KEY`/`_PATH`, `JWT_ACCESS_TTL`900, `REFRESH_TTL_SECONDS`14d, `BCRYPT_ROUNDS`10). `BcryptPasswordHasher` (bcryptjs). `Rs256TokenSigner` (`{email,role,type:'access'}`, subject=id → `AccessToken`). `RedisEventPublisher` (dual-write). `RedisRefreshSessionStore` (token key `auth:rt:tok:<sha256>`, family `auth:rt:fam:<id>`; issue random hex, markRotated keeps for reuse detection, revokeFamily DELs all).
**Presentation:** `AUTH_PATTERNS.{register,login,refresh,logout,me}`.
**Prisma:** `users` (email @unique, password_hash, role, status), `refresh_sessions` (token_hash @unique, family_id). **Seed:** admin `admin@fardeen.local`/`Admin@12345`.
**Token model:** RS256 (private signs at auth, public verifies at gateway); access 15 min; refresh opaque httpOnly-cookie 14-day, rotated every use with family reuse detection.

---

## 3. project-service, quotation-service, service-management

Clean Architecture; each owns its Postgres DB + Prisma client (`apps/<svc>/generated/client`); TCP `@MessagePattern`. Shared idioms: identical hybrid `main.ts`, `PrismaService`, `HealthController`, `result.util` (`toErr`), `env.ts` (`APP_CONFIG`/`loadConfig`), VOs/entities `create()`/`rehydrate()`. **Money = integer minor units.**

### 3.1 project-service (`project_db`)
**Domain:** `Project` — **invariant `featured ⇒ published AND coverMediaId`** (`create` checks, `rehydrate` doesn't); `isPublished()`. `Category`. `Slug` VO. Ports `PROJECT_REPOSITORY`/`CATEGORY_REPOSITORY`; `ProjectListFilter{categorySlug?,featured?,page,limit,includeUnpublished}`.
**Application:** `CreateProject` (`PROJECT_SLUG_TAKEN`/`CATEGORY_NOT_FOUND` guards; publish event only if published), `UpdateProject` (partial merge; event only on `!wasPublished && isPublished`), `ListProjects` (published-only default), `GetProjectBySlug`/`GetProjectById`(admin, drafts)/`ListCategories`/`RemoveProject`.
**Infrastructure:** repo `list` where-filter + `orderBy [featured desc, year desc, createdAt desc]`; `save` upsert flattening metrics; dual-write publisher. `PROJECT_DATABASE_URL`.
**Presentation:** `PROJECT_PATTERNS.*`. **Prisma:** `categories`, `projects` (slug @unique, cover_media_id?, gallery_media_ids[], status, featured, metrics_*). **Seed:** 3 categories, 7 projects (1 draft; featured skyline-villa/penthouse-interior).

### 3.2 quotation-service (`quotation_db`)
**Domain:** `QuotationRequest` — **status lifecycle** `requested→[reviewing,lost]`, `reviewing→[quoted,lost]`, `quoted→[won,lost]`, won/lost terminal; `changeStatus` returns `{from,to}` (same-status no-op; invalid → ValidationError). **`total = Σ qty×unitPrice.amount`**. VOs `Money`/`BudgetRange`/`QuoteContact`. Port `QUOTATION_REPOSITORY`.
**Application:** `RequestQuotation` (**idempotency** by key → `ok(existing)` no event; else emit `quotation.requested`), `SetQuotationStatus` (`QUOTATION_NOT_FOUND`; emit `quotation.statusChanged` only if `from!==to`), `GetQuotation`/`ListQuotations`/`GetQuotationStats` (`countByStatus`).
**Infrastructure:** repo include lineItems, upsert delete-all+recreate line items, `groupBy` stats (5 keys seeded 0). `QUOTATION_DATABASE_URL`.
**Presentation:** `QUOTATION_PATTERNS.*`. **Prisma:** `quotation_requests` (idempotency_key @unique), `quote_line_items` (unit_price Int). **Seed:** 2 requests (one quoted with total 390000).

### 3.3 service-management (`service_db`) — no events
**Domain:** `ServiceOffering` (+features/pricingTiers); VOs `Slug`/`Money`. Port `SERVICE_REPOSITORY`.
**Application:** `ListServices`(active)/`ListAllServices`(incl inactive)/`GetServiceBySlug`(`SERVICE_NOT_FOUND`)/`UpsertService` (**fresh randomUUID per feature/tier**; upsert by slug; no event).
**Infrastructure:** upsert keyed on slug, children delete-all+recreate. `SERVICE_DATABASE_URL` (no Redis client).
**Presentation:** `SERVICE_PATTERNS.*`. **Prisma:** `service_offerings`, `features`, `pricing_tiers`. **Seed:** 12 offerings.

---

## 4. contact-service, cms-service, media-service, notification-service
Identical Clean-Architecture skeleton; dual-write Redis publisher (contact/cms/media).

### 4.1 contact-service (`contact_db`)
`ContactSubmission` (`markRead` only `new→read`, `archive`, `setStatus`); VOs `Email`/`Phone`(≥7 digits). **`SubmitContact`** — idempotency: found → `ok(existing)` no save/publish; else save + emit `contact.submitted`. `SetContactStatus`(`CONTACT_NOT_FOUND`)/`ListContacts`. Repo `save` update writes only `{status}`. **Prisma:** `contact_submissions` (idempotency_key @unique). Seed 2.

### 4.2 cms-service (`cms_db`)
`Page` (`publish()`, **`sections` getter sorted by order**), `Testimonial`, `Slug`. **`GetPage`** (published-only default; `includeUnpublished` reveals drafts), **`PublishPage`** (emit `cms.published`), **`UpdatePage`** (preserve status; new sections `id ?? randomUUID()`), `ListPages`/`ListTestimonials`. Repo save replaces sections wholesale. **Prisma:** `pages`, `sections` (**`@@unique([pageId,order])`**), `testimonials`. Seed: `home` page (4 sections) + 3 testimonials.

### 4.3 media-service (`media_db` + MinIO)
**Requires MinIO on :9000 — the `MEDIA_STORE` async factory calls `ensureBucket()` at DI, so it fails to boot without MinIO (why it stays down in the native fleet); `MINIO_ROOT_PASSWORD` required.** `Asset` (**`markReady` `pending→ready` returns true once**). `MEDIA_STORE` port (`presignPut/Get/exists`). `PresignUpload` (objectKey `<ctx>/<id>/<name>`, pending), `GetAsset` (**lazy confirm** → publish `media.uploaded` once), `ResolveMany` (**dedupe + omit missing**, keyed map). `MinioMediaStore`. **Prisma:** `assets` (variants Json). Seed: 13 assets matching cms/project media ref ids (`status:'ready'`, no bytes).

### 4.4 notification-service (`notification_db`) — event consumer only (no `@MessagePattern`)
`Notification` (`markSent`/`markFailed`/`incrementAttempt`). `EMAIL_SENDER` port. **`deliverEmail`** (queued → attempt → send; on fail markFailed+save **then rethrow** so consumer doesn't ack → retry). Handlers `HandleContactSubmitted` (2 emails: sales + auto-reply), `HandleQuotationRequested` (sales), `HandleQuotationStatusChanged` (client); each idempotency-guarded + `markProcessed`. **`StreamConsumer`** — `XGROUP CREATE ... MKSTREAM`, `XREADGROUP BLOCK` readLoop, poison messages XACK'd, success XACK, **throw → no ack → PEL**; reclaimLoop `XPENDING IDLE` → `deliveries>maxAttempts` **dead-letter** (XACK to drop) else `XCLAIM` reprocess. `NodemailerEmailSender` (Maildev SMTP 1025). Config `MAX_ATTEMPTS`(5)/`RECLAIM_IDLE_MS`(15000)/`BLOCK_MS`(5000)/`BATCH`(10). **Prisma:** `notifications` (append-only log) + `processed_events` (`correlation_id @id` idempotency ledger). Consumes `contact.submitted` + the two `quotation.*`.

---

## 5. Frontend — public site & cinematic engine

Next.js 15.1.3 App Router (`apps/frontend`), React 18.3, Tailwind ink+gold. Public site fully readable/functional **with no JS, no WebGL, reduced motion** — every enhancement additive and gated.

### 5.1 App shell & config
`next.config.mjs` (`output:'standalone'`, `transpilePackages:[@fardeen/ui,types,utils,config]`, images avif/webp + localhost:9000 remotePatterns, `optimizePackageImports:[@fardeen/ui]`). `tsconfig.json` + `tsconfig.spec.json`. `tailwind.config.ts` (config preset + UI content glob + font vars). `.env.local` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`). `project.json` `dev` = `next dev -H 0.0.0.0 -p 3000`. `app/layout.tsx` (Inter→`--font-sans`, Cormorant→`--font-display`, full metadata, `.skip-link`, JsonLd, `<Providers>`). `globals.css` (reduced-motion kill-switch, `:focus-visible` ring). `robots.ts`/`sitemap.ts`/`app/api/health/route.ts`/`app/not-found.tsx` (root, required for clean `next build`).

### 5.2 Marketing routes `app/(marketing)/**`
`layout.tsx` (header/main/footer). `page.tsx` Home (server, **`revalidate=3600`**, `safe()` fallbacks, `<Hero>` + `<CinematicMount/>` + sections). `projects/page.tsx` (`revalidate=60`, LIMIT=9, async searchParams, out-of-range page → redirect, `<CategoryFilter>`/`<Pagination>`). `projects/[slug]/page.tsx` (**404 → `notFound()`**, cover + `<Prose>` + gallery + `projectJsonLd`). `services/page.tsx`. `contact/page.tsx` (server-fetches services for the quotation multiselect; `<ContactForm>` + `<QuotationForm>`). `error.tsx`/`not-found.tsx`.

### 5.3 Components & forms
Providers: `ThemeProvider → QueryProvider(staleTime 60s, retry 1) → LazyMotion(domAnimation, strict)`. Layout: `SiteHeader`/`SiteFooter`/`PageHeader`. `MediaImage` (gradient placeholder + `next/image` overlay only when url ok; never broken). `JsonLd`. Sections: `Hero`(`#hero-heading`)/`SectionIntro`/`ServicesSection`/`ProjectsSection`/`TestimonialsSection`(null if empty)/`ContactSection`. Projects/Services: `ProjectCard`/`CategoryFilter`(crawlable `?category=`)/`Pagination`(link-based)/`ServiceCard`. Motion primitives (client, static fallback when `useMotionReady`/`useReducedMotion`): `RevealText`/`RevealGroup`/`RevealItem`/`MagneticCard`/`TiltCard`/`Parallax`/`AccentLine`/`SuccessReveal`. Forms (RHF + zodResolver + shared schemas + TanStack, `noValidate`, aria-live, idempotency `useRef` key): `contact-form` (`submitContactSchema`), `quotation-form` (client-only `quotationFormSchema` with budget superRefine + service checkboxes seeded from SSR).

### 5.4 Data layer & hooks
`lib/api.ts` — `API_BASE_URL`, envelope types, `ApiError{status,code,message,details}`, `request<T>` + `get` (ISR `next:{revalidate=60}`); reads (`getServices`/`getProjects`/`getProject`/`getCategories`/`getHomePage`/`getTestimonials`), writes (`submitContact`/`submitQuotation` + `Idempotency-Key`). `lib/site.ts` (`SITE`/`NAV_LINKS`). `lib/media.ts` (`resolveMediaUrl`). `lib/seo.ts` (schema.org). `lib/format.ts` (`formatPriceFromMinor`). Hooks: `use-reduced-motion` (**defaults true**, hydrates), `use-motion-ready` (`hydrated && !reduced`), `use-webgl-support`.

### 5.5 Cinematic engine (photoreal)
Client-only raw three.js, demand-rendered, gated, fallback-safe; layer `aria-hidden`, copy also in DOM.
- **`cinematic-mount.tsx`** — gate + lazy activator: `dynamic(import('./cinematic-experience'), {ssr:false})`; `enabled = !reducedMotion && webgl===true`; layout-reserving placeholder + one-shot interaction listeners (`wheel/pointermove/touchstart/keydown`) mount the engine (Lighthouse's programmatic scroll never triggers it → no LCP/TBT/CLS hit).
- **`cinematic-experience.tsx`** — pinned canvas. Renderer `ACESFilmicToneMapping` + `PCFSoftShadowMap`, DPR cap 2. Demand loop (`pipeline.render()`, FPS → `pipeline.adapt`, publishes `window.__fardeenPerf{dpr,drawCalls,triangles,tier,fps}`). Lenis = sole scroll authority (single gsap.ticker). `window.__fardeenSeek = director.seek` (0..1 seam). `void enrichWorld(...)`.
- **`scenes.ts`** — data only; `SCENES[]` 11 scenes + camera keyframes/eases; `SCENE_COUNT=11`; `sceneWindow(id)=[id-1,id]`; `PALETTE` (stops [0,2,4,9,10]); `BRAND`.
- **`world.ts`** — `createWorld()` (sky/terrain/grass 1400/birds 14/villa growGroup boxes/gate; `DirectionalLight` shadow key 2048², low ambient, fog). `enrichWorld(world, renderer, invalidate)` — **async, guarded**: HDRI `sunset_puresky_1k.hdr` → PMREM → `scene.environment`; PBR grafts (concrete→shell, wood→cladding, marble→floor, grass→terrain); 3 real GLB furniture (sofa/coffee_table/armchair) → interior, hides procedural boxes.
- **`director.ts`** — one scrubbed GSAP timeline (scrub 0.5, `onUpdate:invalidate`); per-scene camera + palette + villa choreography (slab/rebar rise, structure, shell→warm stone + cladding/glass/windows, gate open, interior light, glow); `seek(p)=master.progress(clamp)+invalidate`.
- **`pipeline.ts`** — `EffectComposer` (HalfFloat, 2× MSAA): `RenderPass→SSAO→UnrealBloom(windows)→OutputPass(ACES+sRGB)→Vignette`. **3 adaptive degrade-only tiers** (0 full · 1 no SSAO · 2 no post+shadows, DPR→1); `adapt(fps)` steps down on 3 frames `0<fps<26`; core HDRI+PBR+ACES always on.
- **`assets.ts`** — lazy loaders (reject → procedural fallback): `loadTexture`, `loadPbr` (diff+nor+arm), `loadEnvironment` (RGBELoader→PMREM), `createModelLoader` (GLTF+DRACO`/draco/`+KTX2`/basis/`+meshopt — the seam), `loadModel`.
- **Public assets** (`public/cinematic/`, CC0 Poly Haven, git-ignored, `SOURCES.md` manifest): 2 HDRIs, 4 PBR sets, 3 furniture glTF; decoders in `public/{draco,basis}`. **No CC0 luxury-villa GLB exists** → exterior is realistic-material procedural; seam documented for a purchased drop-in. Follow-ups: KTX2 compression, per-scene HDRI swap (dawn ready).

---

## 6. Admin panel, testing & dev/infra

### 6.1 Admin panel (ADR-005: server-side session; tokens never in client JS)
Browser only talks to same-origin `/api/admin/*`; handlers attach a Bearer (from httpOnly cookie) and proxy to `/api/v1/admin/*`.
- **Cookies:** `fardeen_admin_at` (JWT) + `fardeen_admin_rt` (refresh, re-homed from gateway `fardeen_rt`); `httpOnly, sameSite:lax, secure(prod), path:/, maxAge 14d`. `decodeClaims` decodes the JWT payload **without verification** (routing/gating only; gateway re-verifies). `ADMIN_ROLES=['admin','editor']`.
- **3 gates:** `middleware.ts` (presence only, redirects); `(panel)/layout.tsx` (server, decodes at cookie → 403 for visitor, else `<AdminShell>`); gateway RBAC (real authorization — editor DELETE → 403).
- **Proxy `api/admin/[...path]/route.ts`:** path-traversal guard (rejects `.`/`..`/slashes), Bearer attach, **proactive + reactive (on-401) refresh** with cookie rotation, verbatim envelope passthrough.
- **`lib/admin/gateway.ts`** (server): `gatewayLogin/Refresh/Logout/callAdmin`. Session handlers: login (validates `loginSchema`, **rejects visitor 403**, returns only `{user}`), logout.
- **`admin-client.ts`:** only browser data path; `adminApi.{dashboard,projects,services,pages,contacts,quotations}` + `qk` keys; 401 → login redirect. `money.formatMinor`; `categories.loadCategories` (public route).
- **Screens (`(panel)`):** Dashboard (StatTiles); Projects (publish toggle + edit all; **Delete only admin**; 403 message); project-form (`createProjectSchema`); Services (inline activate re-sends full record; no delete); service-form (edit finds by slug; nested features/tiers `RowEditor`); Pages + page-editor (sections `payload` as JSON; Save vs Publish); Contacts (filter + inline status); Quotations list + detail (lifecycle, `formatMinor`). Primitives in `_components` (`ui.tsx`, `toast`, `modal`, `session-context`, `admin-shell`).

### 6.2 Testing
- **Unit (8a):** shared preset (node, ts-jest isolatedModules, excludes integration, maps `@fardeen/*` to source). Backend coverage `src/{domain,application}/**` @ **85%** (some 90%). ~60 spec files, ~293 tests. Frontend jsdom hook/scene specs.
- **Integration (8b-1):** `jest.integration.config.js` (`apps/**/*.integration.spec.ts`, **maxWorkers 1**). `scripts/setup-integration-dbs.sh` creates 8 `*_test` DBs on **native Postgres** (no Docker) + migrates. `test/integration/support.ts`. 8 specs incl **`auth-flow`** (RS256 sign→verify, rotation, **reuse → family revocation** vs real Redis) and **`event-durability`** (real Redis Streams + Postgres: delivery, **backlog-drain durability**, **idempotency**, **retry→dead-letter**; EmailSender mocked).
- **E2E (8b-2):** `playwright.config.ts` (workers 1, targets running stack via `dev-up.ps1`, trace on failure). Specs: public (contact 201, quotation, projects), admin (login→dashboard, create→public→edit→delete, ISR-tolerant), **rbac** (editor DELETE → 403 server-side; visitor refused), reduced-motion (no `<canvas>`), a11y. 13 green.

### 6.3 Dev & infra tooling
**Light dev (Windows, no Docker):** native pg 5432 + redis 6379 (`fardeen-dev-infra\start-infra.ps1`); services as compiled `dist`; **MinIO not staged → media-service down**.
- **`dev-up.ps1`** — one persistent terminal; **Job Object `KILL_ON_JOB_CLOSE`** kills all children on close; **`-Prod`** (next start ~200MB) / **`-Rebuild`**; `pg_isready`-gate (avoids P1001 race); build-if-stale; free stale ports; start 10 services (`run-svc.cjs`, staggered) + frontend; health gate + status loop.
- **`dev-down.ps1`** (cleanup orphans), **`scripts/run-svc.cjs`** (env bootstrap for compiled dist).
- **Docker:** `docker-compose.yml`/`.infra.yml` (adds Maildev 1025/1080)/`.prod.yml`; Dockerfiles under `infra/`.

**Ports & DB (database-per-service; admin-service has NO DB):**

| Service | TCP | HTTP | DB / `*_DATABASE_URL` |
|---|---|---|---|
| gateway | 4000 (`/api/v1/health`) | 4000 | — |
| auth | 4010 | 3010 | `auth_db` / `AUTH_DATABASE_URL` |
| cms | 4011 | 3011 | `cms_db` / `CMS_DATABASE_URL` |
| project | 4012 | 3012 | `project_db` / `PROJECT_DATABASE_URL` |
| service-management | 4013 | 3013 | `service_db` / `SERVICE_DATABASE_URL` |
| contact | 4014 | 3014 | `contact_db` / `CONTACT_DATABASE_URL` |
| quotation | 4015 | 3015 | `quotation_db` / `QUOTATION_DATABASE_URL` |
| media | 4016 | 3016 | `media_db` / `MEDIA_DATABASE_URL` (needs MinIO) |
| admin | 4017 | 3017 | **none** |
| notification | 4018 | 3018 | `notification_db` / `NOTIFICATION_DATABASE_URL` |
| frontend | — | 3000 (`/api/health`) | — |

Native URL: `postgresql://fardeen:fardeen_dev_pw@localhost:5432/<db>?schema=public` (integration appends `_test`). Logins: `admin@fardeen.local`/`Admin@12345`, `editor@fardeen.local`/`Editor@12345`, `viewer@fardeen.local`(visitor)/`Viewer@12345`.

---

## 7. Appendix

### 7.1 Domain event catalog
| Event | Producer | Data | Consumed by |
|---|---|---|---|
| `contact.submitted` | contact | `{contactId,email,subject}` | notification (sales + auto-reply) |
| `quotation.requested` | quotation | `{quotationId,email}` | notification (sales) |
| `quotation.statusChanged` | quotation | `{quotationId,email,from,to}` | notification (client) |
| `project.published` | project | `{projectId,slug,title}` | (future cache) |
| `cms.published` | cms | `{pageId,slug}` | (future cache) |
| `media.uploaded` | media | `{assetId,ownerContext,objectKey}` | (future) |
| `user.registered`/`user.roleChanged` | auth | `{userId,…}` | (future) |

All = `DomainEvent<T>{id,occurredAt,correlationId,version:1,name,data}`, dual-written `stream:<name>` (XADD) + `<name>` (PUBLISH).

### 7.2 Service quick reference
| Service | Owns | Emits | Consumes | Notable rule |
|---|---|---|---|---|
| gateway | — | — | — | only public door; local RS256; RBAC; envelope |
| auth | auth_db + Redis | user.* | — | refresh rotation + reuse → family revocation |
| project | project_db | project.published | — | featured ⇒ published + coverMediaId |
| quotation | quotation_db | quotation.* | — | status lifecycle; total = Σ qty×unitPrice |
| service-management | service_db | — | — | upsert by slug; no events |
| contact | contact_db | contact.submitted | — | idempotencyKey no-op |
| cms | cms_db | cms.published | — | published-only public; ordered sections |
| media | media_db + MinIO | media.uploaded | — | markReady once; **needs MinIO to boot** |
| notification | notification_db | — | contact.submitted, quotation.* | Streams consumer; idempotent; retry→dead-letter |
| admin | none (BFF) | — | — | composes read models; forwards commands |

### 7.3 Key file index
- Contracts `packages/types/src/*` · Kernel `packages/shared/src/*` · Tokens/UI `packages/config/src/tokens.ts`, `packages/ui/src/*`.
- Gateway `apps/gateway/src/{presentation,common,auth,config}/*` · Auth `apps/auth-service/src/{domain,application,infrastructure,presentation}/*`.
- Cinematic `apps/frontend/src/lib/cinematic/{scenes,world,director,pipeline,assets}.ts` + `components/cinematic/{cinematic-mount,cinematic-experience}.tsx`.
- Admin `apps/frontend/src/{middleware.ts, lib/admin/*, app/api/admin/**, app/admin/**}`.
- Dev/infra `dev-up.ps1`, `dev-down.ps1`, `scripts/run-svc.cjs`, `scripts/setup-integration-dbs.sh`, `docker-compose*.yml`, `infra/**`, `docs/**`.

*End of reference — a file-by-file read of the repository as of 2026-08-05.*
