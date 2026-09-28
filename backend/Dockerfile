FROM node:22-alpine

WORKDIR /app

# Install openssl for Prisma on Alpine
RUN apk add --no-cache openssl python3 make g++

# Copy package manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate prisma client
RUN npm install
RUN npx prisma generate

# Copy application source
COPY . .

# Ensure fixtures.json is accessible if referenced relatively
COPY ../fixtures.json ../fixtures.json 2>/dev/null || true

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node src/scripts/seed-fixtures.js && node src/server.js"]
