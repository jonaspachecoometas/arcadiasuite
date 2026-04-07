#!/bin/bash
# MetaSet BI - Initialization Script
# Arcádia Suite

set -e

echo "========================================="
echo "MetaSet BI - Starting up..."
echo "========================================="

# Environment variables with defaults
METASET_PORT="${METASET_PORT:-8100}"
DATABASE_URL="${DATABASE_URL:-postgresql://arcadia:arcadia123@db:5432/metaset_db}"
ARCADIA_DATABASE_URL="${ARCADIA_DATABASE_URL:-postgresql://arcadia:arcadia123@db:5432/arcadia}"
METASET_ADMIN_USER="${METASET_ADMIN_USER:-admin}"
METASET_ADMIN_EMAIL="${METASET_ADMIN_EMAIL:-admin@arcadia.app}"
METASET_ADMIN_PASSWORD="${METASET_ADMIN_PASSWORD:-metaset2026}"
REDIS_URL="${REDIS_URL:-redis://redis:6379/1}"

echo "[MetaSet] Configuration:"
echo "  Port: $METASET_PORT"
echo "  Database: ${DATABASE_URL//@*/@*****/}"
echo "  Redis: ${REDIS_URL//@*/@*****/}"

# =============================================================================
# WAIT FOR DEPENDENCIES
# =============================================================================

echo "[MetaSet] Waiting for PostgreSQL..."
until python3 -c "
import psycopg2
import sys
try:
    conn = psycopg2.connect('$DATABASE_URL')
    conn.close()
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
" 2>/dev/null; do
    echo "[MetaSet] PostgreSQL not ready, retrying in 2s..."
    sleep 2
done
echo "[MetaSet] PostgreSQL is ready!"

echo "[MetaSet] Waiting for Redis..."
until python3 -c "
import redis
import sys
try:
    r = redis.from_url('$REDIS_URL')
    r.ping()
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
" 2>/dev/null; do
    echo "[MetaSet] Redis not ready, retrying in 2s..."
    sleep 2
done
echo "[MetaSet] Redis is ready!"

# =============================================================================
# DATABASE MIGRATIONS
# =============================================================================

echo "[MetaSet] Running database migrations..."
# TODO: Run Superset migrations
# superset db upgrade

echo "[MetaSet] Initializing roles and permissions..."
# TODO: Run Superset init
# superset init

# =============================================================================
# CREATE ADMIN USER
# =============================================================================

echo "[MetaSet] Creating admin user..."
python3 << PYEOF
import sys
sys.path.insert(0, '/app')

try:
    # TODO: Create admin user in Superset
    print(f"[MetaSet] Admin user: $METASET_ADMIN_USER")
    print(f"[MetaSet] Admin email: $METASET_ADMIN_EMAIL")
    print("[MetaSet] Admin creation skipped (Superset integration pending)")
except Exception as e:
    print(f"[MetaSet] Warning creating admin: {e}")
    
sys.exit(0)
PYEOF

# =============================================================================
# REGISTER ARCÁDIA DATABASE
# =============================================================================

echo "[MetaSet] Registering Arcádia database connection..."
python3 << PYEOF
import sys
sys.path.insert(0, '/app')

try:
    # TODO: Register Arcádia database in Superset
    print(f"[MetaSet] Arcádia DB: ${ARCADIA_DATABASE_URL//@*/@*****/}")
    print("[MetaSet] Database registration skipped (Superset integration pending)")
except Exception as e:
    print(f"[MetaSet] Warning registering database: {e}")
    
sys.exit(0)
PYEOF

# =============================================================================
# START SERVER
# =============================================================================

echo "========================================="
echo "MetaSet BI - Starting server on port $METASET_PORT"
echo "========================================="

# Start MetaSet server (Apache Superset via Gunicorn)
exec python run.py --host 0.0.0.0 --port "$METASET_PORT" --workers 2
