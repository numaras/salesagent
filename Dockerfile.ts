# TypeScript app - MCP, A2A, Admin, health (src/run.ts)
# Build: docker build -f Dockerfile.ts .
# Run:   docker run -p 3000:3000 -e DATABASE_URL=postgresql://... <image>

FROM node:22-alpine

WORKDIR /app

# Install dependencies (include dev for tsx)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev 2>/dev/null || npm install

# Copy source, config, and migrations (so db:migrate works in container)
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src

# Default port for the TS server
ENV PORT=3000
EXPOSE 3000

# MCP at /mcp, A2A at /a2a, Admin at /admin, health at /health
CMD ["npm", "run", "start"]
