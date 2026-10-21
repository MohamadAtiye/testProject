#!/bin/sh
set -e

echo "[backend] running migrations..."
node dist/scripts/migrate.js

echo "[backend] seeding demo data..."
node dist/scripts/seed.js

echo "[backend] ensuring admin account..."
node dist/scripts/ensure-admin.js

echo "[backend] starting API..."
exec node dist/server.js
