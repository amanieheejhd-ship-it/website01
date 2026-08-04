# syntax=docker/dockerfile:1.7
# ============================================================================
#  Parametrized multi-stage image for the Fardeen Nest apps
#  (gateway + the 9 TCP microservices). One Dockerfile, DRY across all apps.
#
#  Build args:
#    PROJECT      short Nx project name   e.g. gateway | auth-service
#    PROJECT_PKG  workspace package name  e.g. @fardeen/gateway
#
#  Targets:
#    dev    full workspace + toolchain; source bind-mounted at runtime (hot reload)
#    prod   minimal, non-root, prod-only deps, `node dist/main.js`
#    tools  full workspace for the one-shot prod migrate job
# ============================================================================
ARG NODE_VERSION=20-alpine

# ─────────────────────────────── base ───────────────────────────────
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
RUN corepack enable && apk add --no-cache tini
WORKDIR /workspace
ENTRYPOINT ["/sbin/tini", "--"]

# ─────────────────────────────── deps ───────────────────────────────
# Only manifests are copied, so `pnpm install` is cached until a package.json or the
# lockfile changes. --frozen-lockfile preserves root pnpm.overrides (react/react-dom 18.3.1).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/frontend/package.json             apps/frontend/
COPY apps/gateway/package.json              apps/gateway/
COPY apps/auth-service/package.json         apps/auth-service/
COPY apps/cms-service/package.json          apps/cms-service/
COPY apps/media-service/package.json        apps/media-service/
COPY apps/project-service/package.json      apps/project-service/
COPY apps/service-management/package.json   apps/service-management/
COPY apps/contact-service/package.json      apps/contact-service/
COPY apps/quotation-service/package.json    apps/quotation-service/
COPY apps/admin-service/package.json        apps/admin-service/
COPY apps/notification-service/package.json apps/notification-service/
COPY packages/ui/package.json      packages/ui/
COPY packages/config/package.json  packages/config/
COPY packages/shared/package.json  packages/shared/
COPY packages/types/package.json   packages/types/
COPY packages/utils/package.json   packages/utils/
RUN pnpm install --frozen-lockfile

# ─────────────────────────────── dev ───────────────────────────────
# The full repo is bind-mounted over /workspace at runtime and node_modules comes from a
# named volume (populated from this image). The run command (nx <app>:dev = nest --watch)
# is supplied by docker-compose per app.
FROM deps AS dev
ENV NODE_ENV=development
CMD ["node", "-e", "console.error('Set `command:` in docker-compose (e.g. pnpm nx dev gateway)'); process.exit(1)"]

# ─────────────────────────────── build ───────────────────────────────
FROM deps AS build
ARG PROJECT
COPY tsconfig.base.json nx.json ./
COPY packages/ packages/
COPY apps/ apps/
RUN pnpm nx build ${PROJECT}

# ──────────────────────────── prod-deploy ────────────────────────────
# `pnpm deploy` assembles an isolated, production-only deployment (built app + pruned
# node_modules) outside the workspace. --legacy uses the copy-based implementation that
# does not require inject-workspace-packages.
FROM build AS prod-deploy
ARG PROJECT_PKG
RUN pnpm --filter="${PROJECT_PKG}" --prod --legacy deploy /prod

# ─────────────────────────────── prod ───────────────────────────────
FROM node:${NODE_VERSION} AS prod
RUN apk add --no-cache tini && addgroup -S app && adduser -S -G app app
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deploy --chown=app:app /prod ./
USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

# ─────────────────────────────── tools ───────────────────────────────
# Full workspace (prisma available) for the one-shot prod migrate job. Runs as the seam
# script; real Prisma schemas arrive in Phase 4.
FROM deps AS tools
ENV NODE_ENV=production
COPY tsconfig.base.json nx.json ./
COPY packages/ packages/
COPY apps/ apps/
CMD ["sh", "infra/scripts/migrate.sh"]
