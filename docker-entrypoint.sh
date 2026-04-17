#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Running bootstrap-admin..."
npx tsx scripts/bootstrap-admin.ts

echo "Starting server..."
exec node server.js
