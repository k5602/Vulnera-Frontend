# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Configure npm with registry mirror and increased timeout for reliability
RUN npm config set registry https://registry.npm.taobao.org && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

COPY package.json package-lock.json ./

# Install dependencies with BuildKit cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npm run build

# Production stage - nginx + Node.js runtime
FROM nginx:alpine

# Install Node.js runtime and npm for Astro server
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Configure npm with registry mirror and increased timeout for reliability
RUN npm config set registry https://registry.npm.taobao.org && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

# Copy package files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./

# Install only production dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

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

# Health check on nginx port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O- http://localhost:5173/ || exit 1

# Start via entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
