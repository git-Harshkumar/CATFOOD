#!/bin/sh
set -e

echo "[Docker Entrypoint] Starting Hackathon Judgment Platform Backend..."

# Ensure data directory exists
mkdir -p /app/data

# Sync database schema with Prisma (creates tables without data loss)
echo "[Docker Entrypoint] Synchronizing database schema..."
npx prisma db push --skip-generate

# Check and seed if database is unseeded
echo "[Docker Entrypoint] Checking database state..."
node src/scripts/init-db.js

# Start backend server
echo "[Docker Entrypoint] Starting server..."
exec node src/server.js
