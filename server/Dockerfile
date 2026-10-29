# Stage 1: Build & Prisma Client Generation
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL is required by Prisma engines on Alpine Linux
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for prisma CLI)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# OpenSSL is required by Prisma runtime engines
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy application manifests
COPY --chown=node:node package*.json ./

# Copy installed node_modules (including locked prisma CLI and generated Prisma Client) from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy Prisma schema, migrations, and seed files
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Copy application source code
COPY --chown=node:node src ./src

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
