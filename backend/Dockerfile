FROM node:22-alpine

WORKDIR /app

# Install openssl for Prisma engines on Alpine
RUN apk add --no-cache openssl

# Copy package manifests from backend directory
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies cleanly respecting package-lock.json
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy fixtures.json so initial seeding can load it
COPY fixtures.json ./fixtures.json

# Copy backend source code and entrypoint
COPY backend/src ./src/
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh

# Make entrypoint executable and prepare data directory with correct ownership
RUN chmod +x ./docker-entrypoint.sh && \
    mkdir -p /app/data && \
    chown -R node:node /app

# Run as non-root user
USER node

# Expose backend API port
EXPOSE 8080

# Set default runtime environment variables
ENV PORT=8080 \
    NODE_ENV=production \
    DATABASE_URL=file:/app/data/dev.db

# Entrypoint script synchronizes schema, checks for seeding, and launches the server
ENTRYPOINT ["./docker-entrypoint.sh"]
