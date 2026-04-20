#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Running bootstrap-admin..."
node scripts/bootstrap-admin.mjs

echo "Starting server..."
exec node server.js
