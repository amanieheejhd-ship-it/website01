# syntax=docker/dockerfile:1.7
# ============================================================================
#  Next.js 15 frontend image. Dev reuses the shared node.Dockerfile `dev` target;
#  this file is the PRODUCTION build using Next `output: 'standalone'` for a small,
#  non-root runtime image.
# ============================================================================
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
RUN corepack enable && apk add --no-cache tini
WORKDIR /workspace
ENTRYPOINT ["/sbin/tini", "--"]

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

# ─────────────────────────────── build ───────────────────────────────
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json nx.json ./
COPY packages/ packages/
COPY apps/frontend/ apps/frontend/
RUN pnpm nx build frontend

# ─────────────────────────────── prod ───────────────────────────────
FROM node:${NODE_VERSION} AS prod
RUN apk add --no-cache tini && addgroup -S app && adduser -S -G app app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
# Next standalone output (monorepo layout): server.js lives under apps/frontend, and the
# traced node_modules sit at the standalone root.
COPY --from=build --chown=app:app /workspace/apps/frontend/.next/standalone ./
COPY --from=build --chown=app:app /workspace/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=app:app /workspace/apps/frontend/public ./apps/frontend/public
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
