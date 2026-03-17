#!/bin/bash
set -e

echo "[Superset Init] Iniciando configuracao..."
superset db upgrade

superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
  --firstname "Arcadia" \
  --lastname "Admin" \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@onboardbi.com.br}" \
  --password "${SUPERSET_ADMIN_PASSWORD:-arcadia1337}" 2>/dev/null || true

superset init

echo "[Superset Init] Iniciando servidor..."
gunicorn \
  --bind "0.0.0.0:8088" \
  --access-logfile "-" \
  --error-logfile "-" \
  --workers 2 \
  --timeout 120 \
  "superset.app:create_app()"
