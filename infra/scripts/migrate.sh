#!/bin/sh
# ============================================================================
#  Prisma migration seam (one-shot job — NOT run on every service boot).
#  Phase 3 wires the mechanism; the actual Prisma schemas land in Phase 4, at
#  which point this loop starts applying real migrations. Until then each service
#  is skipped (no schema yet). admin-service is excluded (it owns no database).
# ============================================================================
set -eu

PGUSER="${POSTGRES_USER:-fardeen}"
PGPASS="${POSTGRES_PASSWORD:-fardeen}"
PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"

# service:logical-db pairs (database-per-service)
PAIRS="auth-service:auth_db \
cms-service:cms_db \
project-service:project_db \
service-management:service_db \
contact-service:contact_db \
quotation-service:quotation_db \
media-service:media_db \
notification-service:notification_db"

for pair in $PAIRS; do
  svc="${pair%%:*}"
  db="${pair##*:}"
  schema="apps/${svc}/prisma/schema.prisma"
  url="postgresql://${PGUSER}:${PGPASS}@${PGHOST}:${PGPORT}/${db}?schema=public"
  if [ -f "$schema" ]; then
    echo ">> prisma migrate deploy: ${svc} (${db})"
    DATABASE_URL="$url" pnpm --filter "@fardeen/${svc}" exec prisma migrate deploy --schema "$schema"
  else
    echo ">> skip ${svc} — no prisma schema yet (added in Phase 4)"
  fi
done

echo "migrate seam complete."
