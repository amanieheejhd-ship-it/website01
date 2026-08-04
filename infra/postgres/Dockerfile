# Production Postgres image with the per-service database bootstrap baked in, so prod needs
# no bind mount for the init scripts (dev mounts infra/postgres/init instead).
FROM postgres:16-alpine
COPY init/ /docker-entrypoint-initdb.d/
