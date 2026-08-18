# Ansari Space Craft (`@fardeen/*` monorepo) — Complete Project Details

> **Ek hi file mein poora codebase.** Yeh document har app, har package, frontend, backend, 3D cinematic system, data models, endpoints, env vars aur architecture ko deeply cover karta hai. Saare hisson ko alag-alag agents ne deeply read karke banaya hai.
>
> **Repo:** `c:\Users\EARNINGFISH\fardeen-website` · **Type:** Nx + pnpm monorepo (microservices + Next.js frontend) · **Brand:** "Ansari Space Craft" (construction company, Zirakpur, Punjab) · **Package scope:** `@fardeen/*`

---

## Table of Contents
1. [System Architecture (bird's-eye)](#1-system-architecture)
2. [Monorepo tooling & conventions](#2-monorepo-tooling--conventions)
3. [Shared packages](#3-shared-packages) — config · shared · types · ui · utils
4. [auth-service](#4-auth-service)
5. [gateway (API edge)](#5-gateway)
6. [cms-service](#6-cms-service)
7. [contact-service](#7-contact-service)
8. [notification-service](#8-notification-service)
9. [project-service](#9-project-service)
10. [quotation-service](#10-quotation-service)
11. [service-management](#11-service-management)
12. [media-service](#12-media-service)
13. [admin-service (BFF)](#13-admin-service-bff)
14. [frontend (Next.js + Cinematic 3D)](#14-frontend)
15. [Cross-cutting notes & quirks](#15-cross-cutting-notes--quirks)

---

## 1. System Architecture

**Pattern:** Database-per-service microservices behind a single public API gateway, plus a Next.js frontend. Backend services are **NestJS 10 TCP microservices** — they expose **no public HTTP business routes**, only `/health` + `/ready` probes. All business calls arrive over **NestJS TCP transport** via `@MessagePattern`, invoked by the gateway (and the admin BFF) using `ClientProxy.send(PATTERN, payload)`. Every service owns its own Postgres DB; cross-context references are plain id strings (no cross-DB foreign keys). Async communication is via **Redis Streams (durable) + pub/sub (ephemeral)** — dual-write per ADR-002.

### Service map & default ports

| Service | TCP port | HTTP (health) | DB | Emits events | Consumes events |
|---|---|---|---|---|---|
| **gateway** | — | 4000 (public REST `/api/v1`) | none | — | — |
| **auth-service** | 4010 | 3010 | `auth_db` | `user.registered` | — |
| **cms-service** | 4011 | 3011 | `cms_db` | `cms.published` | — |
| **project-service** | 4012 | — | `project_db` | `project.published` | — |
| **service-management** | 4013 | — | `service_db` | (none) | — |
| **contact-service** | 4014 | 3014 | `contact_db` | `contact.submitted` | — |
| **quotation-service** | 4015 | — | `quotation_db` | `quotation.requested`, `quotation.statusChanged` | — |
| **media-service** | 4016 | — | `media_db` + MinIO | `media.uploaded` | — |
| **admin-service** (BFF) | 4017 | 3017 | none (Redis cache only) | (none) | — |
| **notification-service** | 4018 | 3018 | `notification_db` | (none) | `contact.submitted`, `quotation.requested`, `quotation.statusChanged` |
| **frontend** (Next.js) | — | 3000 | none | — | — |

### Request flow
```
Browser ──HTTP──▶ Gateway (/api/v1, RS256 verify, RBAC, throttle, CORS, correlation)
                    │
                    ├─TCP▶ auth / cms / project / service / contact / quotation / media / admin
                    │        each returns Result<T> ({ok,data} | {ok,error})
                    │
                    └─ MediaResolver composes media ids → presigned urls (gateway-side only)

Services ──XADD/PUBLISH──▶ Redis Streams ──XREADGROUP──▶ notification-service ──SMTP──▶ email
```

### Key ADRs referenced across the code
- **ADR-002** — durable events: dual-write `XADD stream:<name>` (consumer groups) + `PUBLISH <name>` (cache invalidation).
- **ADR-004** — asymmetric JWT: auth-service holds the **private** RS256 key & mints tokens; gateway holds only the **public** key & verifies locally (no validation round-trip).
- **ADR-005** — admin BFF: `admin-service` owns no DB; it aggregates/forwards to owning services. Admin **UI** lives in the frontend.

---

## 2. Monorepo tooling & conventions

- **Nx workspace + pnpm workspaces.** Apps in `apps/*`, libraries in `packages/*`. TS path aliases in `tsconfig.base.json` map `@fardeen/{config,shared,types,ui,utils}` to each package's `src/index.ts` (consumed from source for typecheck/tests).
- **Dependency layering:** `utils` & `config` are leaf; `types` depends only on `zod`; `shared` may import types/utils/config; `ui` may import utils(+config). Enforced via Nx `tags` (`type:config|shared|...`).
- **Nx targets per project:** `build` (`nest build` / `next build`), `serve` (`node dist/main.js`), `typecheck` (`tsc --noEmit`), `dev` (`node --watch -r ts-node/register src/main.ts` or `next dev`).
- **Jest:** root `jest.preset.js` → `packages/config/jest/preset.js` (ts-jest `isolatedModules`, node env, `@fardeen/*`→source mapping). Backend services collect coverage from `src/domain` + `src/application` @ **85%** thresholds; `shared`/`utils` @ **90%**. Integration tests are `*.integration.spec.ts` (run separately vs real Postgres/Redis).
- **e2e:** Playwright (`playwright.config.ts`, `e2e/`) — 13 tests green per project memory.
- **Deployment note:** No per-service Dockerfiles (only `infra/postgres/Dockerfile`). Services run as compiled `dist`. `vercel.json` configures the Next.js frontend deploy for the Nx monorepo. Local orchestration via `dev-up.ps1` / `dev-down.ps1`; native PG/Redis via `fardeen-dev-infra\start-infra.ps1`. media-service is **not** started in local dev (needs MinIO, not staged).
- **Existing docs in repo:** `MASTER-REFERENCE.md`, `CODEBASE-COMPLETE-REFERENCE.md` (114KB), `README.md`, `GROUND_FLOOR_BEDROOM_PREMIUM_PROMPT.md`, `graph.json` (Nx dep graph).

---

## 3. Shared packages

All five are `projectType: "library"`, `private`, version `0.0.0`, scoped `@fardeen/*`, consumed from source via TS path aliases. `.js`/`.js.map` files next to `.ts` are stale build artifacts — source of truth is `.ts`.

### 3.1 `@fardeen/config`
Shared tooling presets + design tokens (leaf package). Peer dep `tailwindcss ^3.4.17`.
- **Exports map:** `.` → `src/index.ts` (tokens); `./tailwind-preset` → `tailwind/preset.js`; `./jest-preset` → `jest/preset.js`.
- **`tokens`** (`src/tokens.ts`, `as const`) — black/gold luxury palette: `colors.background '#0a0a0a'`, `surface '#141414'`, `foreground '#f5f5f4'`, `muted '#9ca3af'`, `gold {DEFAULT '#c8a15a', light '#e5c987', dark '#9a7736'}`, `border 'rgba(200,161,90,0.24)'`; `radius` sm/md/lg/xl; `font.sans [Inter,…]`, `font.display [Cormorant Garamond,…]`. Type `DesignTokens = typeof tokens`.
- **Tailwind preset** (`tailwind/preset.js`) — `darkMode:'class'`; `theme.extend` mirrors tokens (colors/borderRadius/fontFamily); `plugins:[]`.
- **Jest preset** (`jest/preset.js`) — node env; ts-jest `isolatedModules`; testMatch `*.spec.ts(x)`/`*.test.ts`; ignores `*.integration.spec.ts`; `moduleNameMapper` `@fardeen/{types,shared,utils}` → source.
- **Consumption:** frontend Tailwind config uses the preset; root `jest.preset.js` re-exports the jest preset; Next `transpilePackages` includes it. Raw `tokens` object is not imported by apps (palette reaches apps via Tailwind preset). **No ESLint preset exists here.**

### 3.2 `@fardeen/shared`
Backend kernel — domain errors, event-publisher port, correlation constants. `main`→dist, peer deps `@nestjs/common`, `ioredis`, `rxjs`. CommonJS/ES2021, decorators on.
- **Errors** (`src/errors/domain-error.ts`): `DomainError` base (`code`, `message`, `details?`; `toAppError()`; self-naming) + subclasses `NotFoundError` (`<RESOURCE>_NOT_FOUND`), `ValidationError` (`VALIDATION_ERROR`), `ConflictError` (`CONFLICT`), `UnauthorizedError` (`UNAUTHORIZED`), `ForbiddenError` (`FORBIDDEN`). Stack traces never leak.
- **Ports** (`src/ports/event-publisher.port.ts`): `EVENT_PUBLISHER = Symbol(...)` DI token; `interface EventPublisher { publish<T>(event: DomainEvent<T>): Promise<void> }`.
- **Correlation** (`src/config/correlation.ts`): `CORRELATION_ID_HEADER='x-correlation-id'`, `REQUEST_ID_HEADER='x-request-id'`.
- Coverage threshold 90%. Consumed by all services + notification handlers.

### 3.3 `@fardeen/types`
Single source of truth for every cross-boundary shape (imported by gateway, all services, frontend). Runtime dep `zod ^3.24.1`. Barrel modules:
- **`envelope.ts`** — `ApiMeta`, `PaginationMeta`, `ApiSuccess<T>`, `ApiPaginated<T>`, `ApiErrorBody`, `AppError {code,message,details?}`; `Result<T,E=AppError>` = `{ok:true,data} | {ok:false,error}`; helpers `ok()`, `err()`.
- **`contracts.ts`** — const pattern maps: `AUTH_PATTERNS` (register/login/refresh/logout/validate/me), `CMS_PATTERNS`, `SERVICE_PATTERNS`, `PROJECT_PATTERNS`, `CONTACT_PATTERNS`, `QUOTATION_PATTERNS`, `MEDIA_PATTERNS`, `ADMIN_PATTERNS`; `SERVICE_CLIENTS` DI tokens (`AUTH_CLIENT`…`ADMIN_CLIENT`).
- **`events.ts`** — `EVENTS` (contactSubmitted, quotationRequested, quotationStatusChanged, mediaUploaded, mediaReady, cmsPublished, projectPublished, userRegistered, userRoleChanged); `EventName`; `DomainEvent<TData> {id,occurredAt,correlationId,version,name,data}`.
- **`auth.ts`** — `Role='admin'|'editor'|'visitor'`, `ROLES`, `UserStatus`; `registerSchema`/`loginSchema` (zod) → `RegisterDto`/`LoginDto`; `UserProfile`, `AccessToken`, `AccessTokenClaims {sub,email,role,type:'access'}`; TCP payloads `RegisterPayload`, `LoginPayload`, `LoginResult`, `RefreshPayload`, `RefreshResult`, `LogoutPayload`, `MePayload`.
- **`catalog.ts`** — `FeatureDto`, `PricingTierDto` (priceFrom minor units), `ServiceOfferingDto`; `upsertServiceSchema` → `UpsertServiceInput`; `GetServiceBySlugPayload`.
- **`projects.ts`** — `ProjectStatus='draft'|'published'`; `ProjectMetricsDto`, `CategoryDto`, `ProjectListItemDto`, `ProjectDto`, `ProjectListResult`; `projectListQuerySchema`, `createProjectSchema`; payloads list/getBySlug/getById/create/update/remove.
- **`cms.ts`** — `PageStatus`, `SectionType='hero'|'scene'|'richText'|'gallery'|'cta'`; `SectionDto`, `SeoDto`, `PageDto`, `TestimonialDto`, `AdminPageListItem`; `listTestimonialsQuerySchema`, `updatePageSchema`; payloads getPage/publishPage.
- **`contact.ts`** — `ContactStatus='new'|'read'|'archived'`; `ContactSubmissionDto`; `submitContactSchema`; payloads submit(+idempotencyKey)/list/setStatus; `ContactSubmittedData`.
- **`quotation.ts`** — `QuotationStatus='requested'|'reviewing'|'quoted'|'won'|'lost'`; `QuoteContact`, `BudgetRange`, `QuoteLineItemDto`, `QuotationRequestDto`; `requestQuotationSchema`; payloads request/get/list/setStatus; `QuotationRequestedData`, `QuotationStatusChangedData`, `QuotationStats`.
- **`media.ts`** — `OwnerContext='cms'|'project'|'quotation'`, `AssetStatus='pending'|'ready'`; `AssetVariantDto`, `MediaRefResolved`; `presignUploadSchema`; `PresignUploadResult`, payloads get/resolveMany; `MediaUploadedData`.
- **`admin.ts`** — `DashboardCounters {contacts, quotations, projects, services, generatedAt}`.

### 3.4 `@fardeen/ui`
shadcn/cva React component library (frontend + admin). Deps `class-variance-authority`, `clsx`, `tailwind-merge`, `@fardeen/utils`; peer react 18.3/19. Consumed via `transpilePackages`.
- **`cn()`** (`lib/cn.ts`) — `twMerge(clsx(...))`.
- **Components** (all `forwardRef` + `displayName`, cva variants, exported `*Variants` except `headingVariants`): `Button` (variant default/outline/ghost, size sm/md/lg), `Container` (size narrow/default/wide, polymorphic `as`), `Section` (spacing sm/md/lg), Typography `Eyebrow`/`Heading` (size xl/lg/md/sm, `as` h1–h6)/`Lead`/`Prose` (renders trusted CMS HTML via `dangerouslySetInnerHTML`), `Surface` (variant solid/glass/gold, interactive), Card family `Card`/`CardBody`/`CardTitle`/`CardMeta`, `Badge` (gold/outline/solid), `Input` (+ exported `fieldBase`), `Textarea`, `FormField` (render-prop, a11y label/error/aria wiring; **plain function, not forwardRef**).
- Jest only collects coverage from `src/lib` (visual components untested).

### 3.5 `@fardeen/utils`
Framework-agnostic pure helpers, zero deps, 90% coverage. All in `src/index.ts`:
- `slugify(input)` — NFKD, strip diacritics, lowercase, non-alnum→`-`, trim hyphens.
- `isDefined<T>(v): v is T` — narrowing guard (keeps falsy 0/''/false).
- `assertNever(v): never` — exhaustiveness helper.
- `clamp(value,min,max)` — inclusive.
- `formatINR(amount)` — `Intl.NumberFormat('en-IN', currency INR, no decimals)`.

---

## 4. auth-service

**Purpose:** Identity & access. NestJS 10 TCP microservice + tiny HTTP health server (hybrid bootstrap). Owns `auth_db`. Prisma 6 + Postgres, Redis (`ioredis`) session store, `bcryptjs` hashing, `jsonwebtoken` RS256 (asymmetric), `zod` config. Clean Architecture (domain/application/infrastructure/presentation).

### TCP message handlers (`presentation/auth.controller.ts`, `AUTH_PATTERNS`) — auth/RBAC enforced upstream at gateway
| Pattern | Handler | Payload | Returns |
|---|---|---|---|
| `auth.register` | register | `RegisterPayload {email,password,role?,correlationId?}` | `Result<UserProfile>` |
| `auth.login` | login | `LoginPayload {email,password,userAgent?,correlationId?}` | `Result<LoginResult {access,refreshToken,profile}>` |
| `auth.refresh` | refresh | `RefreshPayload {refreshToken,userAgent?,correlationId?}` | `Result<RefreshResult {access,refreshToken}>` |
| `auth.logout` | logoutHandler | `LogoutPayload {refreshToken}` | `Result<{ok:true}>` |
| `auth.me` | me | `MePayload {userId}` | `Result<UserProfile>` |

> `auth.validate` is declared in contracts but **not implemented** — gateway verifies tokens locally (ADR-004).

### Prisma data model
- **`User`** (`users`): `id` uuid PK, `email` @unique, `passwordHash`, `role` default `visitor` (admin/editor/visitor — plain string, not enum), `status` default `active`, `createdAt`, `updatedAt`.
- **`RefreshSession`** (`refresh_sessions`): `id`, `userId` (@@index), `tokenHash` @unique, `familyId` (@@index), `userAgent?`, `expiresAt`, `revokedAt?`, `createdAt`. **Schema-of-record only — NOT written at runtime** (the live revocable rotation store is Redis).
- No enums, no relations (DB-isolated; `userId` bare string).

### Auth mechanics (deep)
- **Password:** `BcryptPasswordHasher`, rounds from `BCRYPT_ROUNDS` (default 10). Domain `User.verifyPassword` takes comparator as callback (domain never imports bcrypt); inactive user always fails without calling comparator.
- **Access tokens (RS256):** `Rs256TokenSigner` — `jwt.sign({email,role,type:'access'}, privateKey, {algorithm:'RS256', subject:id, expiresIn:900s, issuer:'fardeen-auth', audience:'fardeen-api'})`. Private key from `JWT_PRIVATE_KEY` (`\n`-expanded) or `JWT_PRIVATE_KEY_PATH`.
- **Refresh tokens (opaque, Redis-backed, rotating):** `randomBytes(32).hex` (64 chars); only SHA-256 hash stored. Keys `auth:rt:tok:<sha256>` → JSON `{userId,familyId,active,expiresAt,userAgent}`; `auth:rt:fam:<familyId>` → SET of member hashes. TTL default 14 days (`REFRESH_TTL_SECONDS=1209600`). Ops: `issue`, `get`, `markRotated` (active:false, preserves TTL), `revokeFamily` (DEL all family keys).
- **Rotation + reuse detection** (`RefreshToken.execute`): missing→`REFRESH_INVALID`; `active===false`→ **replay of rotated token** → `revokeFamily` + `REFRESH_REUSE` (401); expired→`REFRESH_INVALID`; else `markRotated(old)` → `findById` (gone/inactive → revoke + `UNAUTHORIZED`) → `issue` same family + new access token.
- **Logout:** idempotent `revokeFamily`.
- **Register:** `Email.create` → `existsByEmail` guard (`EMAIL_TAKEN`) → hash → `User.register({role ?? 'visitor'})` → save → publish `user.registered`.
- **Login:** single `INVALID_CREDENTIALS` for unknown-email / wrong-pw / inactive (no user enumeration).
- **RBAC:** role stored as free-text string; enforcement lives entirely at gateway; auth only stamps role into token.
- **Events:** `RedisEventPublisher` dual-writes `DomainEvent` envelope (XADD + PUBLISH). Emits `user.registered`.

### Env vars
`SERVICE_NAME`, `TCP_PORT`(4010), `HTTP_PORT`(3010), **`AUTH_DATABASE_URL`** (required), `REDIS_HOST/PORT/PASSWORD`, `JWT_PRIVATE_KEY`|`JWT_PRIVATE_KEY_PATH` (one required), `JWT_ACCESS_TTL`(900), `JWT_ISSUER/AUDIENCE`, `REFRESH_TTL_SECONDS`(1209600), `BCRYPT_ROUNDS`(10), `SERVICE_BIND_HOST`, `READY_CHECK_*`. Fails fast if DB url or JWT key missing. Seed: idempotent admin upsert (`SEED_ADMIN_EMAIL ?? admin@fardeen.local`, `SEED_ADMIN_PASSWORD ?? Admin@12345`, bcrypt rounds 10).

### Tests
6 unit specs (email VO, user/refresh-session entities, register/login/refresh/logout use-cases, di-tokens) + `auth-flow.integration.spec.ts` (real Postgres `auth_db_test`, real Redis, real RS256 keys from `secrets/jwt-*.pem`) proving RS256 sign→verify, refresh persistence, single INVALID_CREDENTIALS, rotation, and **reuse detection wiping the whole family**.

---

## 5. gateway

**Purpose:** The **single public HTTP door** (`/api/v1`). NestJS 10 + Express. Verifies RS256 access tokens locally, enforces RBAC + rate limiting + CORS + helmet + correlation ids, fans out to 8 downstream services over TCP `ClientProxy`, composes media refs, wraps everything in a uniform envelope. **No DB.**

### Bootstrap & global middleware
`helmet()`, `cookieParser()`, `enableCors({origin:corsOrigins, credentials:true})`, `setGlobalPrefix('api/v1')`, global `ValidationPipe({whitelist,transform})`, listens on `GATEWAY_PORT`(4000). Global: `ThrottlerModule` (`RATE_LIMIT_TTL`60s/`RATE_LIMIT_MAX`100) as `APP_GUARD`; `AllExceptionsFilter` as `APP_FILTER`; `ResponseEnvelopeInterceptor` as `APP_INTERCEPTOR`; `CorrelationIdMiddleware` on all routes; 8 `ClientProxy` providers (`ClientsWarmup` eager-connects at boot).

### Downstream client → port map
`AUTH_CLIENT`→4010, `CMS_CLIENT`→4011, `PROJECT_CLIENT`→4012, `SERVICE_CLIENT`→4013, `CONTACT_CLIENT`→4014, `QUOTATION_CLIENT`→4015, `MEDIA_CLIENT`→4016, `ADMIN_CLIENT`→4017. `callService(client,pattern,payload)` does `firstValueFrom(client.send(...))`; `!result.ok` → throws `DomainHttpError` (mapped to HTTP by filter), else returns `result.data`.

### Full endpoint table (all under `/api/v1`)
**Auth** (`@Throttle 10/60s`): `POST /auth/register` (admin only, `registerSchema`)→`UserProfile`; `POST /auth/login` (public, `loginSchema`)→`AccessToken`+sets httpOnly refresh cookie; `POST /auth/refresh` (cookie)→new AccessToken, rotates cookie; `POST /auth/logout`→clears cookie; `GET /auth/me` (JwtAuthGuard)→`UserProfile`.
Refresh cookie: `fardeen_rt`, httpOnly, `secure:isProd`, `sameSite:strict`, `path:/api/v1/auth`, `maxAge=refreshTtl*1000`.

**Services** (public): `GET /services`, `GET /services/:slug` (resolves hero media).
**Projects** (public, published-only): `GET /projects` (`projectListQuerySchema`, paginated), `GET /projects/categories` (declared before `:slug`), `GET /projects/:slug` (resolves cover+gallery media).
**Content** (public): `GET /pages/:slug` (resolves seo.ogImage + section mediaRefs), `GET /testimonials`.
**Contact** (`@Throttle 5/60s`): `POST /contact` — requires `Idempotency-Key` header (else `IDEMPOTENCY_KEY_REQUIRED`), `submitContactSchema`.
**Quotations:** `POST /quotations` (public, `@Throttle 5/60s`, requires Idempotency-Key), `GET /quotations/:id` (admin).
**Media:** `POST /media/presign-upload` (`@Roles editor,admin`)→PresignUploadResult (client PUTs directly to MinIO), `GET /media/:id` (public).
**Admin BFF** (`@UseGuards JwtAuthGuard,RolesGuard` `@Roles admin,editor`; **deletes admin-only**): dashboard; projects list/get/create/update/**delete(admin)**; services list/upsert(POST+PATCH:slug); pages list/get/update/publish; contacts list/setStatus; quotations list/get/setStatus. All forward to `ADMIN_PATTERNS.*`.

### Auth mechanics at gateway
- **`JwtAuthGuard`:** requires `Authorization: Bearer`; `jwt.verify(token, publicKey, {algorithms:['RS256'], issuer, audience})` — local, no round-trip. Attaches `req.user={sub,email,role,type}`.
- **`RolesGuard`:** reads `@Roles(...)` metadata; no metadata → allow; missing user → 401; role not in set → `FORBIDDEN` 403.
- **Correlation:** `x-correlation-id` (header or new UUID) + fresh `x-request-id`, echoed + forwarded.
- **Envelope:** success `{data, meta:{requestId}}` (unless already an envelope); error `{error:{code,message,details?}, meta:{requestId}}`. Status map: VALIDATION_ERROR→400; INVALID_CREDENTIALS/UNAUTHORIZED/REFRESH_INVALID/REFRESH_REUSE→401; FORBIDDEN→403; EMAIL_TAKEN/CONFLICT→409; `*_NOT_FOUND`→404; 429→RATE_LIMITED.
- **MediaResolver:** dedupes ids → `media.resolveMany`; **degrades gracefully** (returns `{}` if media-service down).

### Env vars
`NODE_ENV`, `GATEWAY_PORT`(4000), `GATEWAY_GLOBAL_PREFIX`(api/v1), `CORS_ALLOWED_ORIGINS`(localhost:3000), `JWT_PUBLIC_KEY`|`_PATH` (one required), `JWT_ISSUER/AUDIENCE`, per-downstream `*_SERVICE_HOST/PORT` (4010–4017), `REFRESH_COOKIE_NAME`(fardeen_rt), `REFRESH_TTL_SECONDS`, `RATE_LIMIT_TTL/MAX`, `AUTH_RATE_LIMIT_MAX`(10)/`WRITE_RATE_LIMIT_MAX`(5) (parsed but `@Throttle` limits are hardcoded 10/5). **No colocated unit tests** (covered by repo integration/e2e).

---

## 6. cms-service

**Purpose:** Website content — `Page` aggregates (ordered `Section`s + SEO) + `Testimonial`s. Owns `cms_db`. NestJS 10 + Prisma 6 + ioredis + zod. Public reads = published-only; admin reads/writes separate. Publishing emits `cms.published`.

### TCP patterns (`CMS_PATTERNS`)
| Pattern | Use-case | Payload | Returns |
|---|---|---|---|
| `cms.getPage` | GetPage | `{slug, includeUnpublished?}` | `Result<PageDto>` / `err PAGE_NOT_FOUND` |
| `cms.listTestimonials` | ListTestimonials | `{featured?}` | `Result<TestimonialDto[]>` (createdAt desc) |
| `cms.listPages` | ListPages (admin) | none | `Result<AdminPageListItem[]>` (incl. drafts) |
| `cms.updatePage` | UpdatePage (admin) | `UpdatePagePayload` | `Result<PageDto>` |
| `cms.publishPage` | PublishPage (admin) | `{slug,correlationId?}` | `Result<PageDto>` (emits `cms.published`) |

### Prisma data model
- **`Page`** (`pages`): id, slug @unique, title, status default `draft`, seoTitle/seoDescription default `""`, seoOgImageMediaId?, createdAt, updatedAt, sections[].
- **`Section`** (`sections`): id, pageId (FK cascade), type (hero/scene/richText/gallery/cta), order default 0, payload JSONB, mediaRefs String[]. Constraints `@@unique([pageId,order])`, `@@index([pageId])`.
- **`Testimonial`** (`testimonials`): id, author, role/company default `""`, quote, rating default 5, avatarMediaId?, featured default false, createdAt.
- No DB enums.

### Content logic
- Media stored as **plain reference ids** (`Section.mediaRefs`, `Page.seoOgImageMediaId`) — resolved at gateway, never in cms-service.
- `findBySlug` filters unpublished unless flag; `save` **replaces all sections** (deleteMany + create); `UpdatePage` preserves existing status (publish separate), assigns fresh uuid to id-less sections.
- `RedisEventPublisher` dual-write (XADD + PUBLISH), DomainEvent envelope.
- Seed: idempotent published `home` page (hero→scene(villa-reveal)→richText→cta) + 3 testimonials.
- Migration exists: `20260803124546_init`.

### Env vars
`SERVICE_NAME`(cms-service), **`CMS_DATABASE_URL`** (required), `REDIS_HOST/PORT/PASSWORD`, plus `SERVICE_BIND_HOST`, `TCP_PORT`(4011), `HTTP_PORT`(3011), health-probe vars. Tests: use-case + entity + VO unit specs + `cms.repository.integration.spec.ts`; 85% thresholds.

---

## 7. contact-service

**Purpose:** Public contact-form submissions with idempotency guard, emits `contact.submitted`, admin triage. Owns `contact_db`. Same stack as cms.

### TCP patterns (`CONTACT_PATTERNS`)
| Pattern | Use-case | Payload | Returns |
|---|---|---|---|
| `contact.submit` | SubmitContact | `{name,email,phone,subject,message,source?,idempotencyKey,correlationId?}` | `Result<ContactSubmissionDto>` |
| `contact.list` | ListContacts | `{status?,page?,limit?}` | `Result<{items,page,limit,total}>` |
| `contact.setStatus` | SetContactStatus | `{id,status}` | `Result<ContactSubmissionDto>` / `err CONTACT_NOT_FOUND` |

### Prisma data model
**`ContactSubmission`** (`contact_submissions`): id, name, email, phone, subject, message, source default `website`, **idempotencyKey @unique**, status default `new` (new/read/archived), createdAt. `@@index([status])`.

### Logic — form handling, storage, spam protection
- **Submission flow:** `findByIdempotencyKey` → if exists, return as no-op success (idempotent replay); else construct with `Email.create`+`Phone.create` VOs, `status:'new'`, save, emit `contact.submitted {contactId,email,subject}`.
- **Storage:** `save` upserts by id; on update **only touches status** (submissions otherwise immutable). `list` filters by status, orders createdAt desc, paginates + parallel count.
- **Spam/abuse protection (layered):** (1) idempotency (unique key + pre-check + gateway mandates header); (2) rate limiting (gateway 5/60s); (3) input validation (`submitContactSchema` name≤120/email≤254/phone5–24/subject≤160/message≤4000 + domain VOs Email regex, Phone ≥7 digits). *No CAPTCHA/honeypot.*
- **Status transitions:** `markRead` (new→read), `archive`, `setStatus`.
- Seed: 2 submissions (Priya Sharma `new`, Arjun Nair `read`). Migration `20260803131606_init`.

### Env vars
`SERVICE_NAME`, **`CONTACT_DATABASE_URL`** (required), `REDIS_*`, `TCP_PORT`(4014), `HTTP_PORT`(3014). Tests: use-case + entity + Email/Phone VO specs + integration spec; 85%.

---

## 8. notification-service

**Purpose:** **Headless event consumer** (no TCP business patterns, no gateway routes) — subscribes to durable Redis Streams and sends transactional **email** via SMTP/Nodemailer. Owns `notification_db`. Adds `nodemailer`.

### Event consumption model (core)
`StreamConsumer` (eagerly instantiated in DI) starts two loops on bootstrap:
- **Streams consumed** (`stream:<event>`): `contact.submitted`, `quotation.requested`, `quotation.statusChanged`.
- **Group setup:** `XGROUP CREATE ... 0 MKSTREAM` per stream (tolerates BUSYGROUP).
- **readLoop:** `XREADGROUP GROUP <group> <consumer> COUNT <batch> BLOCK <blockMs> STREAMS ... >` → `handle()`.
- **handle:** JSON.parse (poison → XACK drop), dispatch-map lookup (unknown → ack drop), run handler, **XACK on success**; on throw **no ack** → stays pending for retry.
- **reclaimLoop:** every `reclaimIdleMs`, `XPENDING ... IDLE`; if `deliveries > maxAttempts` → **dead-letter** (XACK drop + warn), else `XCLAIM` + reprocess.
- This is the durability guarantee (ADR-002): messages XADD'd while consumer is down are still delivered on restart.

### Handlers (idempotent on `correlationId` — check `isProcessed` first, `markProcessed` last)
| Handler | Trigger | Emails |
|---|---|---|
| HandleContactSubmitted | `contact.submitted` | `contact-sales`→salesInbox + `contact-autoreply`→submitter |
| HandleQuotationRequested | `quotation.requested` | `quotation-sales`→salesInbox |
| HandleQuotationStatusChanged | `quotation.statusChanged` | `quotation-status`→client |

`deliverEmail` (shared primitive): create `Notification` (channel email), `incrementAttempt`, `email.send` → success `markSent`+save; failure `markFailed`+save **then rethrow** (no ack → retry). Idempotency is per-correlationId (coarse: mid-handler failure re-sends earlier emails on retry).

### Email provider & templates
SMTP via Nodemailer (`createTransport({host,port,secure:false,tls:{rejectUnauthorized:false}})`). Dev = Maildev (localhost:1025). **No SMS, no webhook sender** (channel type includes `webhook` but only `email` produced). "Templates" = string identifiers (`contact-sales`, etc.); subject/body inlined in handlers (text only). "Queue" = Redis Stream + consumer-group PEL.

### Prisma data model
- **`Notification`** (`notifications`): id, channel (email/webhook), template, to, payload JSONB, status default `queued` (queued/sent/failed), attempts default 0, correlationId, createdAt. Indexes on correlationId, status. **Append-only** (`save`=create → each retry = new row).
- **`ProcessedEvent`** (`processed_events`): correlationId @id (PK), processedAt. Durable idempotency ledger.
- **No migrations dir, no seed** (schema present; test DB provisioned by integration harness).

### Env vars
`SERVICE_NAME`, **`NOTIFICATION_DATABASE_URL`** (required), `REDIS_*`, `SMTP_HOST`(localhost)/`SMTP_PORT`(1025)/`SMTP_USER?`/`SMTP_PASSWORD?`, `MAIL_FROM`, `SALES_INBOX`, `NOTIFICATION_GROUP`(notification), `NOTIFICATION_CONSUMER`(notification-1), `NOTIFICATION_MAX_ATTEMPTS`(5), `NOTIFICATION_RECLAIM_IDLE_MS`(15000), `NOTIFICATION_BLOCK_MS`(5000), `NOTIFICATION_BATCH`(10), `TCP_PORT`(4018), `HTTP_PORT`(3018).

### Tests
Unit: deliver, 3 handlers, email-sender port, result.util, notification entity. **Flagship integration:** `event-durability.integration.spec.ts` (real Redis Streams + real Postgres, mocked EmailSender) proving delivery, **durability** (backlog while consumer DOWN drained on start), **idempotency** (same correlationId → 1 email/row), **retry→dead-letter**.

---

## 9. project-service

**Purpose:** Portfolio domain — `Category` + `Project`. Owns `project_db`. Emits `project.published`. Public reads published-only; admin incl. drafts.

### TCP patterns (`PROJECT_PATTERNS`)
| Pattern | Use-case | Auth | Payload → Result |
|---|---|---|---|
| `list` | ListProjects | public | `{category?,featured?,page,limit,includeUnpublished?}` → `Result<ProjectListResult{items,page,limit,total}>` |
| `getBySlug` | GetProjectBySlug | public | `{slug,includeUnpublished?}` → `Result<ProjectDto>`; `PROJECT_NOT_FOUND` |
| `getById` | GetProjectById | admin | `{id}` → `Result<ProjectDto>` (drafts) |
| `listCategories` | ListCategories | public | none → `Result<CategoryDto[]>` (order asc) |
| `create` | CreateProject | admin | `CreateProjectPayload` → `Result<ProjectDto>`; `PROJECT_SLUG_TAKEN`/`CATEGORY_NOT_FOUND`; emits `project.published` if created published |
| `update` | UpdateProject | admin | `UpdateProjectPayload` (partial) → `Result<ProjectDto>`; emits event only on draft→published |
| `remove` | RemoveProject | admin | `{id}` → `Result<{removed:true}>`; `PROJECT_NOT_FOUND` |

### Prisma data model
- **`Category`** (`categories`): id, slug @unique, name, order default 0, projects[].
- **`Project`** (`projects`): id, slug @unique, title, summary/body default `""`, categoryId (FK), location default `""`, year Int, coverMediaId? (plain ref), galleryMediaIds String[], status default `draft`, featured default false, metricsArea?/metricsDurationMonths?, createdAt/updatedAt. Indexes categoryId/status/featured.

### Domain logic
- **Project invariant:** a `featured` project must be `published` AND have `coverMediaId`, else `ValidationError`.
- Slug VO (`slugify`, empty→ValidationError).
- Repo `list`: where from includeUnpublished/categorySlug/featured; `orderBy [featured desc, year desc, createdAt desc]`; paginate + count.
- `UpdateProject`: field merge with `?? existing`, careful undefined-vs-null for coverMediaId/metrics; re-runs invariant; emits only on `!wasPublished && isPublished`.
- Seed: 3 categories (home-construction, interior, commercial) + 7 projects (6 published incl 2 featured, 1 draft).

### Env vars
`SERVICE_NAME`, **`PROJECT_DATABASE_URL`** (required), `REDIS_*`, `TCP_PORT`(4012). Tests: slug/entity/use-case specs + integration spec (`project_db_test`).

---

## 10. quotation-service

**Purpose:** Quotation requests (leads→quote lifecycle) + line items (pricing). Owns `quotation_db`. Idempotent intake, status state-machine, total derived from line items. Emits `quotation.requested`, `quotation.statusChanged`.

### TCP patterns (`QUOTATION_PATTERNS`)
| Pattern | Use-case | Auth | Notes |
|---|---|---|---|
| `request` | RequestQuotation | public | **Idempotent** (existing key → return existing, no event); else status `requested`, empty lineItems, emits `quotation.requested {quotationId,email}` |
| `get` | GetQuotation | admin | `{id}`; `QUOTATION_NOT_FOUND` |
| `list` | ListQuotations | admin | `{status?,page?=1,limit?=20}` createdAt desc |
| `stats` | GetQuotationStats | admin | `Result<QuotationStats{byStatus,total}>` |
| `setStatus` | SetQuotationStatus | admin | guarded by aggregate; emits `quotation.statusChanged {quotationId,email,from,to}` only if from≠to |

### Prisma data model
- **`QuotationRequest`** (`quotation_requests`): id, contactName/Email/Phone, serviceSlugs String[], projectType default `""`, budgetMin/Max Int?, budgetCurrency?, timeline default `""`, details default `""`, attachments String[], status default `requested`, **idempotencyKey @unique**, createdAt, lineItems[]. Index status.
- **`QuoteLineItem`** (`quote_line_items`): id, quotationId (FK **cascade**), label, qty default 1, unitPrice Int, currency default `INR`. Index quotationId.

### Domain logic
- **Status machine:** `requested→[reviewing,lost]`, `reviewing→[quoted,lost]`, `quoted→[won,lost]`, `won→[]`, `lost→[]`. `changeStatus` throws `ValidationError` on invalid transition.
- **Total:** `Σ qty * unitPrice.amount`.
- VOs: `Money.of(amount,'INR')` (finite,≥0,round), `BudgetRange.of(min,max)` (min≥0,max≥min), `QuoteContact` (email regex, phone ≥7 digits, non-empty name).
- Repo `save`: on update **replaces all line items** (deleteMany+create). `countByStatus` via groupBy → zeroed byStatus map + total.
- Seed: 2 requests (`seed-quote-1` requested; `seed-quote-2` quoted with 2 line items).

### Env vars
`SERVICE_NAME`, **`QUOTATION_DATABASE_URL`**, `REDIS_*`, `TCP_PORT`(4015). Tests: entity (status machine + total), 3 VO specs, request/setStatus/query use-case specs, integration spec.

---

## 11. service-management

**Purpose:** Catalog of services offered (12 construction offerings) with nested Features + PricingTiers. Owns `service_db`. **No Redis / no events.** Public list = active-only; admin sees all + upsert.

### TCP patterns (`SERVICE_PATTERNS`)
| Pattern | Use-case | Auth | Notes |
|---|---|---|---|
| `list` | ListServices | public | active only, order asc, features ordered |
| `listAll` | ListAllServices | admin | incl. inactive |
| `getBySlug` | GetServiceBySlug | public | `{slug}`; `SERVICE_NOT_FOUND` |
| `upsert` | UpsertService | admin | builds new ids, `Money.of` each tier, **upsert by slug** |

### Prisma data model
- **`ServiceOffering`** (`service_offerings`): id, slug @unique, name, tagline/description/icon default `""`, heroMediaId?, order default 0, active default true, createdAt/updatedAt, features[], pricingTiers[].
- **`Feature`** (`features`): id, offeringId (FK **cascade**), title, description default `""`, order default 0.
- **`PricingTier`** (`pricing_tiers`): id, offeringId (FK **cascade**), name, priceFrom Int, currency default `INR`, unit default `""`, inclusions String[].

### Logic
- Aggregate = holder with create/rehydrate; nested Feature/PricingTier (priceFrom as Money).
- Repo `upsertBySlug`: on update **replaces children** (deleteMany+create).
- Seed: 12 offerings (Home Construction, Aluminium Work, Glass Work, ACP Cladding, False Ceiling, Modular Kitchen, Interior Design, Exterior Design, Steel Fabrication, Railings, Renovation, Commercial Projects) each with 2 default features, `icon=slug`.

### Env vars
`SERVICE_NAME`, **`SERVICE_DATABASE_URL`**, `REDIS_*` (parsed but unused), `TCP_PORT`(4013). Tests: Money/Slug VO, entity, upsert/list/getBySlug use-case specs, integration spec.

---

## 12. media-service

**Purpose:** Asset metadata in `media_db`; **bytes live in MinIO** (S3-compatible). Issues presigned PUT/GET URLs so clients upload/download directly (bytes never traverse gateway). Lazy "ready" confirmation + `media.uploaded` event. Dep `minio`. **Not run in dev** (MinIO not staged).

### TCP patterns (`MEDIA_PATTERNS`)
| Pattern | Use-case | Notes |
|---|---|---|
| `presignUpload` | PresignUpload | creates **pending** Asset (`objectKey=<ownerContext>/<uuid>/<sanitizedFilename>`), returns presigned **PUT** url |
| `get` | GetAsset | `{id}`; `ASSET_NOT_FOUND`. **Lazy confirm:** if object now exists in MinIO & was pending → markReady, save, emit `media.uploaded` once; presigns GET for asset + variants |
| `resolveMany` | ResolveMany | `{ids[]}` → map id→MediaRefResolved; dedups/filters, missing ids omitted. Used by gateway composition |

### Prisma data model
**`Asset`** (`assets`): id, bucket, objectKey, mime, size Int default 0, checksum default `""`, ownerContext (cms/project/quotation), ownerId?, variants **Json** default `"[]"` (array of `{kind,objectKey}`), status default `pending` (pending/ready), createdAt. Index ownerContext.

### Logic
- Asset aggregate `markReady()` (pending→ready, idempotent). Variant kinds: thumb|poster|webp|avif|glb-draco.
- **MediaStore port:** `presignPut/presignGet` (default expiry 3600s), `exists` (statObject try/catch), `ensureBucket` (called in DI factory at boot).
- Repo `save`: on update only status/size/checksum.
- Seed: 13 Asset rows whose ids **match** project/cms media reference strings (e.g. `media-skyline-cover`, `media-hero-video`, `media-villa-glb`, `media-og-home`); each gets a thumb variant, `status:'ready'`. Bytes not uploaded — ids are the point.

### Env vars
`SERVICE_NAME`, **`MEDIA_DATABASE_URL`**, `REDIS_*`, `MINIO_ENDPOINT`(localhost)/`MINIO_PORT`(9000)/`MINIO_USE_SSL`(false)/`MINIO_ROOT_USER`(fardeen)/**`MINIO_ROOT_PASSWORD`** (required)/`MINIO_BUCKET`(fardeen-media), `TCP_PORT`(4016). Tests: entity, get/presign/resolveMany use-case specs, ports/tokens spec, integration spec.

---

## 13. admin-service (BFF)

**Purpose:** Admin Backend-for-Frontend / aggregator (ADR-005). Owns **no database, no Prisma**. (a) Composes the dashboard by fanning out counts to owning services; (b) forwards admin commands/reads to owning services over TCP, returning their `Result<T>` unchanged. Only state = short-TTL Redis cache (`admin:dashboard`). Gateway enforces Bearer + RBAC before any handler.

### Downstream wiring
6 TCP `ClientProxy` clients (project, service, cms, contact, quotation, media). `TcpDownstream.call(service,pattern,payload)` = `firstValueFrom(client.send(...))`. `AdminClientsWarmup` eager-connects at boot.

### Dashboard composition (`GetDashboard.execute`)
1. Return cached `DashboardCounters` if present.
2. Else `Promise.all` fan-out, each wrapped in `safe()` (degrades to fallback on domain error **or** transport failure): project.list ×2 (total + published), service.list + listAll, contact.list total + status:new, quotation.stats.
3. Build counters `{contacts:{new,total}, quotations:{byStatus,total}, projects:{published,total}, services:{active,total}, generatedAt}` — **any single service down degrades its tile to 0/[]**.
4. Cache with TTL, return `ok(counters)`.

### Message patterns (`ADMIN_PATTERNS`) — all forward to owning service, return `Result<T>` unchanged
`dashboard` (local, cached); `projectsList` (forces includeUnpublished:true), `projectsGet/Create/Update/Remove`; `servicesList` (listAll), `servicesUpsert`; `pagesList`, `pagesGet` (forces includeUnpublished:true), `pagesUpdate`, `pagesPublish`; `contactsList`, `contactsSetStatus`; `quotationsList`, `quotationsGet`, `quotationsSetStatus`. (media client wired/warmed but no handler forwards to it.)

### Env vars
`SERVICE_NAME`; per-downstream host/port (`PROJECT_SERVICE_*`4012, `SERVICE_MGMT_*`4013, `CMS_SERVICE_*`4011, `CONTACT_SERVICE_*`4014, `QUOTATION_SERVICE_*`4015, `MEDIA_SERVICE_*`4016); `REDIS_*`; `DASHBOARD_CACHE_TTL`(10s); `TCP_PORT`(4017), `HTTP_PORT`(3017). **No tests, no jest.config.**

---

## 14. frontend

**Purpose:** Public marketing website + gated admin panel for **Ansari Space Craft**. Signature feature: **scroll-scrubbed cinematic 3D villa walkthrough** in raw Three.js.

### Tech stack
Next.js 15.1.3 (App Router, `output:'standalone'`), React 18.3.1, Three.js 0.171.0 (raw WebGL — **not** R3F for the main scene, though `@react-three/fiber`/`drei` are deps), GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.18 (smooth scroll), framer-motion 11 (LazyMotion), Tailwind 3.4.17 (shared preset), TanStack Query 5, react-hook-form 7 + zod. Workspace pkgs `@fardeen/{ui,types,utils,config}` transpiled by Next. Dark-only ink/gold theme; Inter + Cormorant Garamond via next/font.

### Config & env
- `next.config.mjs`: `output:'standalone'`, `staticPageGenerationTimeout:240`, `transpilePackages` (4 pkgs), `images.remotePatterns` (localhost:9000 MinIO + images.pexels.com), avif/webp, `optimizePackageImports:['@fardeen/ui']`, `experimental.cpus:1` (weak dev machine).
- Env: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/api/v1`), `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`), `NODE_ENV`.

### Routes / pages
- **Root layout** (`app/layout.tsx`): `<html class="dark">`, ParticleField, JSON-LD (org+website), Providers, skip-link, global metadata.
- **Homepage** `(marketing)/page.tsx` (`revalidate=3600`): server-fetches (all `safe()`-wrapped) home CMS + services + 6 projects + featured testimonials → `<Hero>`, `<CinematicMount>` (3D journey), rich-text intro, `<ServicesSection>`, `<ProjectsSection>`, `<TestimonialsSection>`, `<AnsariFaqSection>` wrapping `<ContactSection>`, service ItemList JSON-LD.
- **Contact** — `?service`/`?subject` prefill; PageHeader + ContactForm.
- **Services** (`revalidate=60`): hero, 12-item CORE_SERVICES index+details, turnkey band, 5-step process, quality areas, project types, reasons, FAQs (`<details>`), CTA; Service + BreadcrumbList JSON-LD.
- **Projects index** (`revalidate=60`): fetches projects (50/pg) + categories, hydrates each to `RealCaseStudy` (resolving media urls), buckets into 12 PORTFOLIO_CATEGORIES via keyword map → `<CaseStudyBrowser>`.
- **Project detail** `[slug]` (`revalidate=60`): `getProject`, `ApiError` 404→`notFound()`; badges, metrics, cover MediaImage (priority), body prose, gallery grid, quotation CTA, CreativeWork JSON-LD.

### The Cinematic 3D System (deep)
Files: `lib/cinematic/*` + `components/cinematic/*`.
- **`<CinematicMount>`** — runs the heavy engine **only if** `!reducedMotion && !smallScreen(<1024px) && webgl===true`. Otherwise `<StaticInteriorNavigator>` (7-room accessible accordion). When enabled but idle → layout-reserving placeholder (`SCENE_COUNT*80vh`). The real `CinematicExperience` is `dynamic(ssr:false)` loaded only on **first genuine interaction** (wheel/pointermove/touchstart/keydown) — **Lighthouse-aware**: audits fire `scroll` not `wheel`, so the three.js bundle never loads during audits (no LCP/TBT/CLS hit) while humans get it instantly.
- **`<CinematicExperience>`** — sticky full-viewport `<canvas>`, scroll scrubs a GSAP timeline. Raw `THREE.WebGLRenderer` (antialias, pixelRatio min(1.5,dpr), SRGB, **ACESFilmicToneMapping** exposure 0.76, PCFSoftShadowMap). **Demand render loop** — one frame per scrub tick via `invalidate()`, only when inViewport (IntersectionObserver 200px) + tabVisible. FPS sampling every 30 frames → `pipeline.adapt(fps)`. **Lenis** is sole scroll authority (single gsap.ticker, `lagSmoothing(0)`). Async `enrichWorld()` raced against 8s deadline. Verification seams on `window.__fardeen*` (buildSignature, seek, benchmark, interiorState, visibilityState, cameraState, setCamera) — deleted on unmount.
- **World builder** (`lib/cinematic/world.ts`, ~5900 lines) — builds the **entire villa procedurally in raw three.js** (no GLB required). Primitives: gradient sky shader, displaced terrain, instanced grass (wind shader), instanced birds, landscape (paving/lawn/water), animated gate. `buildVilla()` = slab + instanced rebar (49 rods) + walls + columns + upper mass + roof + walnut cladding + glass + emissive windows + animated doors + named `upperLeftFacade` group (the harness-inspected object). Returns rooms {living,dining,kitchen,stairs,landing,master,masterBath,commonBath,secondBedroom,terrace}. `createWorld()`: 48° camera, FogExp2, DirectionalLight sun (2048² shadows). `enrichWorld()` (async, off LCP path): loads HDRI `sunset_puresky_1k.hdr` → PMREM env (IBL), grafts real CC0 PBR (concrete/wood/marble/grass); every load try/catch → keeps procedural on failure. Furniture GLBs behind `loadDecorativeHeroModels=false` flag; rock/plant photogrammetry behind an early `return` (documented dead code, ~1.3M-tri cost).
- **Scenes** (`scenes.ts`): **13 scenes** (SCENE_COUNT=13), each a 1-unit timeline window with camera keyframe + optional `route: CameraWaypoint[]` (collision-free path). Story: 1 Empty land → 2 Foundation → 3 Structure rises → 4 Shell→villa → 5 Arrive/gate → 6 Main door opens into Living hall → 7 Kitchen & dining → 8 Ground guest suite (16-waypoint route + door open/close) → 9 up staircase to Master bedroom (13-waypoint) → 10 Attached washroom → 11 Second bedroom → 12 Terrace/skyline → 13 Final exterior reveal. Also `sceneWindow(id)`, `PALETTE` (dawn→evening stops), `BRAND` colors.
- **Director** (`director.ts`): ONE scrubbed GSAP timeline (`scrub:0.5`); every tween writes directly to three.js (React never re-renders on scroll). Construction choreography (slab/rebar/columns/walls/roof), shell→villa tint, gate/door swings, interior light warm-up, final sun ramp. **`applyVisibilityAt(t)`** — visibility is a **pure function of time** (reverse-scrub-safe, no historical latch); rebar retired at 3.75.
- **Post-processing** (`pipeline.ts`): RenderPass (HalfFloat HDR, 2× MSAA) → SSAO → UnrealBloom → Bokeh DoF → Vignette → OutputPass. **Adaptive degrade-only** tiering (from deviceMemory/hardwareConcurrency/software-GPU); steps down after 3 sustained windows <26fps; tier0 full → tier1 drops SSAO+DoF → tier2 drops post+shadows + DPR→1. Never oscillates.
- **Asset loaders** (`assets.ts`): `CINEMATIC_BASE='/cinematic'`; GLTFLoader wired with DRACO (`/draco/`) + KTX2 (`/basis/`) + meshopt; every loader rejects on failure → callers keep procedural geometry.
- **HYBRID frame-scrubber** (`walkthrough-scrubber.tsx`): **standalone, NOT wired into homepage** — an alternative path drawing a pre-rendered photoreal JPEG/WebP sequence one drawImage per frame (Apple-style, ~zero GPU). The "proven-possible" path per project memory (real-time full villa too heavy; user must supply photoreal render).

### Non-cinematic components
- **Sections:** hero, services-section, projects-section (falls back to FEATURED_PORTFOLIO Pexels cards when CMS empty), testimonials-section, contact-section, section-intro, ansari-faq-section.
- **Layout:** site-header (centered wordmark, transparent), site-footer (brand/nav/contact/Google Map iframe), page-header.
- **Interactive:** particle-field (gold constellation canvas, global), hero-tools (desktop arc of 8 trade icons), pointer-glow (cursor glow + magnetic pull).
- **Motion** (all fall back to static via `useMotionReady`): reveal (RevealText/Group/Item), magnetic-card, tilt-card, parallax, accent-line, success-reveal.
- **Forms:** contact-form (RHF + `submitContactSchema` + TanStack mutation + stable idempotency key), quotation-form (**defined but never imported** — orphan; quotations funnel to contact form with `?subject=Request a quotation`).
- **Projects:** case-study-browser (12-category tabbed), real-project-card (auto-advancing carousel), project-card, category-filter (crawlable `?category=`), pagination, portfolio-data, reference-portfolio (Pexels).
- **Services/Media/SEO/Providers:** service-card, services-content (CORE_SERVICES + FAQs), media-image (next/image + ink→gold gradient placeholder on null/error), json-ld, providers (Theme→Query→LazyMotion→PointerGlow), query-provider (staleTime 60s, retry 1), theme-provider (dark-only).

### API layer & backend calls
- **`lib/api.ts`** — typed gateway client; `request()` has hard **3s timeout** (fails fast into `safe()` fallbacks, never hangs an RSC render / `next build`). Reads (RSC, ISR): getServices/getService/getProjects/getCategories/getProject/getHomePage/getTestimonials. Writes (client): submitContact, submitQuotation (both with `Idempotency-Key`, `crypto.randomUUID`). `ApiError` class + envelope types.
- **Other lib:** media.ts (`resolveMediaUrl`), format.ts (`formatPriceFromMinor`), seo.ts (JSON-LD builders), site.ts (SITE constants, NAV_LINKS).
- **API routes:** `health/route.ts`; `admin/[...path]/route.ts` (**same-origin BFF proxy** to gateway `/admin/*`, attaches Bearer from httpOnly `fardeen_admin_at`, proactive + reactive-on-401 refresh, path-traversal guarded); `admin/session/login` (validates loginSchema, gatewayLogin, rejects non-admin 403, homes tokens as httpOnly cookies); `admin/session/logout`.

### Admin panel (`app/admin/`)
Auth (ADR-005): browser talks only to same-origin `/api/admin/*`; tokens in httpOnly cookies, never client JS.
- `middleware.ts` — gates `/admin/:path*` by cookie presence.
- `(panel)/layout.tsx` — authoritative server role-gate (decodes `fardeen_admin_at`, allows admin/editor, 403 for visitor).
- `_lib/`: admin-client (adminApi via `/api/admin/*`), session (cookie names, `ADMIN_ROLES`, `decodeClaims` unverified — routing only, gateway re-verifies), cookies, gateway (server-only gatewayLogin/Refresh/Logout).
- `_components/`: admin-shell, login-form, session-context, ui (Spinner/StatTile/Table/StatusBadge/Select/Switch/Pagination), modal (+ ConfirmDialog), toast.
- **Screens:** dashboard (live counters), projects (table + publish toggle + **delete admin-only** + create/edit form), services (list + activate/deactivate, no hard delete + form with repeatable features/tiers), pages (list + page-editor with typed JSON sections + publish), contacts (triage new→read→archived), quotations (list + detail with lifecycle requested→…→won/lost).

### Public assets (`public/`)
- `cinematic/hdri/`: `sunset_puresky_1k.hdr` (active env), `dawn_1k.hdr` (ready, not swapped in).
- `cinematic/models/` (glTF+bin+textures, CC0 Poly Haven): sofa, coffee_table, armchair, plant, rocks, boulder — loaded only via `enrichWorld` seam (furniture behind `false` flag; rocks/plant behind early return).
- `cinematic/textures/`: 4 PBR sets concrete/grass/marble/wood (`SOURCES.md` maps them).
- `cinematic/walkthrough/`: HYBRID frame sequences (JPEG **placeholders** of the repo's own scene — to be replaced by real photoreal render): bathroom/bedroom/dining/kitchen/suite (30 frames each), exterior (40 frames). ~190 placeholder frames + `index.html` demo.
- `cinematic/SOURCES.md`: asset license/sourcing manifest — no CC0 luxury-villa GLB exists, so villa is procedural; user drops `models/villa/villa.glb` to swap (seam proven by the 5 GLBs).
- `draco/` (DRACO decoder), `basis/` (KTX2/Basis transcoder) — for `createModelLoader`.

### Tests
Jest + jsdom; coverage only on use-reduced-motion, use-motion-ready, `cinematic/scenes.ts`.

---

## 15. Cross-cutting notes & quirks

1. **Consistency/duplication:** `main.ts`, `health.controller.ts`, `prisma.service.ts`, `result.util.ts`, and the Redis event publisher are copy-identical across services (deliberate per-service isolation; no shared runtime module beyond `@fardeen/{shared,types,utils}`).
2. **Contract source of truth:** all message-pattern names, payload/DTO types, `Result`/`ok`/`err`, `EVENTS`, `SERVICE_CLIENTS`, and status unions come from `@fardeen/types` — services never define their own wire contracts.
3. **Events emitted:** `user.registered` (auth), `cms.published` (cms), `project.published` (project), `quotation.requested` + `quotation.statusChanged` (quotation), `media.uploaded` (media), `contact.submitted` (contact). service-management and admin-service emit nothing. Only **notification-service consumes** (contact.submitted, quotation.requested, quotation.statusChanged).
4. **Cross-context references** are always plain id strings (media ids, service slugs, attachments) — no cross-DB foreign keys (database-per-service).
5. **No per-service Dockerfiles** (only `infra/postgres/Dockerfile`) — services run compiled `dist`.
6. **`RefreshSession` Postgres table exists but is not written at runtime** — effective session store is Redis.
7. **Redis token label bug (cosmetic):** project/quotation/media (and cms/contact) label their Redis client symbol `'AUTH_REDIS_CLIENT'` (copy-paste; harmless — symbols unique by reference).
8. **notification-service opens a TCP transport it never uses** (registers no `@MessagePattern`).
9. **notification `Notification.save` is append-only** (create, not upsert) → each retry = new row; handler idempotency is coarse (per-correlationId).
10. **media-service intentionally not started in local dev** (needs MinIO, not staged).
11. **admin-service has no DB, no tests.**
12. **`media.validate`/`auth.validate` in contracts unused** — gateway verifies JWT locally (ADR-004).
13. **Frontend uses raw three.js (not R3F)** for the hero scene, deliberately keeping React out of the render path.
14. **Lighthouse-aware lazy activation** — 3D bundle doesn't load during automated audits.
15. **Reverse-scrub-safe determinism** — visibility is a pure function of timeline time; door/state tweens use absolute positions.
16. **Degrade-only adaptive quality** — pipeline steps down on sustained low FPS, never oscillates.
17. **Graceful-everything** — every backend fetch has 3s fail-fast + `safe()` fallback; every image has a placeholder; every asset loader rejects into procedural fallback; the whole 3D layer degrades to a static room navigator.
18. **Orphan `QuotationForm`** — full form + schema mapping exists but unused (quotations route through contact form).
19. **Two cinematic paths coexist** — the shipped real-time procedural walkthrough + the standalone (unwired) frame-sequence scrubber for a future photoreal render.
20. **Naming split:** brand is "Ansari Space Craft" while the monorepo/packages are `@fardeen/*` and cookies are `fardeen_admin_*`/`fardeen_rt`.
21. **Large `.bak` archive** — dozens of dated `world.ts`/`scenes.ts`/`director.ts` snapshots document the villa-authoring iteration history; inert but present.

---

*Generated by deep-reading every source file across the monorepo (apps + packages + frontend). Binary assets (.hdr/.bin/.jpg/.glb) are catalogued but not decoded. Existing longer docs: `MASTER-REFERENCE.md`, `CODEBASE-COMPLETE-REFERENCE.md`.*
