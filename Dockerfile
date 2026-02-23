# TypeScript app - MCP, A2A, Admin, health (src/run.ts)
# Multi-stage: builds React frontend, then copies into the app image.
# Build: docker build -f Dockerfile.ts .
# Run:   docker run -p 3000:3000 -e DATABASE_URL=postgresql://... <image>

# ── Stage 1: build React frontend ──────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: application ───────────────────────────────────────
FROM node:22-alpine AS app

WORKDIR /app

# Install dependencies (include dev for tsx)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev 2>/dev/null || npm install

# Copy source, config, and migrations (so db:migrate works in container)
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist/frontend ./dist/frontend

# Default port for the TS server
ENV PORT=3000
EXPOSE 3000

# MCP at /mcp, A2A at /a2a, Admin at /admin, health at /health
CMD ["npm", "run", "start"]
