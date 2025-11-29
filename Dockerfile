# syntax=docker/dockerfile:1.4
# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies with retries for network resilience
RUN npm ci || npm ci || npm ci

COPY . .

RUN npm run build

# Production stage - nginx + Node.js runtime
FROM nginx:alpine

# Install Node.js runtime, npm, and curl for health checks
RUN apk add --no-cache nodejs npm curl

WORKDIR /app

# Copy package files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./

# Install only production dependencies with retries
RUN npm ci --omit=dev || npm ci --omit=dev || npm ci --omit=dev

# Copy built Astro app from builder
COPY --from=builder /app/dist ./dist

# Copy nginx config template (will be templated by entrypoint)
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Expose port 5173 (nginx reverse proxy)
EXPOSE 5173

# Set default backend URL (can be overridden at runtime with -e PUBLIC_API_BASE=...)
ENV PUBLIC_API_BASE=http://localhost:8000

# Set Astro internal port (nginx proxies to this)
ENV PORT=3000

# Health check on nginx port - increased start-period to 90s for cold starts
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -sf http://localhost:5173/ || exit 1

# Start via entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
