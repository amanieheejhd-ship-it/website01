#!/bin/sh
# MinIO bucket bootstrap. Runs in a one-shot `minio/mc` init container once MinIO is healthy.
# The equivalent logic is inlined in the compose `createbuckets` service (so prod needs no
# bind mount); this file is the canonical reference and is usable via `mc` directly.
set -eu

MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_BUCKET="${MINIO_BUCKET:-fardeen-media}"

until mc alias set local "http://${MINIO_ENDPOINT}:${MINIO_PORT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; do
  echo "waiting for MinIO at ${MINIO_ENDPOINT}:${MINIO_PORT}..."
  sleep 2
done

mc mb --ignore-existing "local/${MINIO_BUCKET}"
# Public read for delivered media (media-service still issues presigned PUTs for uploads).
mc anonymous set download "local/${MINIO_BUCKET}" || true

echo "MinIO bucket ready: ${MINIO_BUCKET}"
