#!/bin/bash
# Create + migrate the dedicated *_test databases for the integration suite (idempotent).
# Uses the NATIVE Postgres (localhost:5432) started via fardeen-dev-infra/start-infra.ps1 — NO Docker.
set -e
cd "$(dirname "$0")/.."

PSQL="/c/Users/EARNINGFISH/fardeen-dev-infra/pg/pgsql/bin/psql.exe"
[ -f "$PSQL" ] || PSQL="psql" # fall back to psql on PATH
export PGPASSWORD=fardeen_dev_pw
PGARGS="-h localhost -p 5432 -U fardeen"

# service → its dedicated test database
SERVICES="auth-service:auth_db_test cms-service:cms_db_test project-service:project_db_test \
service-management:service_db_test contact-service:contact_db_test quotation-service:quotation_db_test \
media-service:media_db_test notification-service:notification_db_test"

for pair in $SERVICES; do
  svc=${pair%%:*}; db=${pair##*:}
  "$PSQL" $PGARGS -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || "$PSQL" $PGARGS -d postgres -c "CREATE DATABASE $db OWNER fardeen;" >/dev/null
  url="postgresql://fardeen:fardeen_dev_pw@localhost:5432/$db?schema=public"
  if [ "$svc" = "notification-service" ]; then
    DATABASE_URL="$url" npx prisma db push --schema "apps/$svc/prisma/schema.prisma" --skip-generate --accept-data-loss >/dev/null
  else
    DATABASE_URL="$url" npx prisma migrate deploy --schema "apps/$svc/prisma/schema.prisma" >/dev/null
  fi
  echo "  ready: $db"
done
echo "All *_test databases created + migrated."
