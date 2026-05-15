# ── Stage 1: install all dependencies ────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# ── Stage 2: build the React client ──────────────────────────────────────────
FROM deps AS client-builder
COPY client/ ./client/
RUN npm run build -w client

# ── Stage 3: compile the TypeScript server ───────────────────────────────────
FROM deps AS server-builder
COPY server/ ./server/
RUN npm run build -w server
# Copy non-TS assets that tsc does not emit
RUN cp server/src/db/schema.sql server/dist/db/schema.sql

# ── Stage 4: lean production image ───────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Install only production dependencies (compiles better-sqlite3 native addon
# against the correct Alpine libc version)
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev

# Compiled server
COPY --from=server-builder /app/server/dist ./server/dist

# Pre-built React client (served by Express in production mode)
COPY --from=client-builder /app/client/dist ./client/dist

# GeoJSON fallback data read by the conflict-layer endpoint at runtime
COPY client/public/geodata/conflict_fronts_demo.geojson \
     ./client/public/geodata/conflict_fronts_demo.geojson

# Persistent data directory (SQLite DB + config.json live here when DB_PATH is set)
RUN mkdir -p data

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/dist/index.js"]
