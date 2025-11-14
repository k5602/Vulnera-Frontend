# Use Node.js 20 LTS as base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source files
COPY . .

# Build the site (generates server code in dist/server/)
RUN npm run build

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built files from builder stage (includes dist/server/ with Astro's generated server)
COPY --from=builder /app/dist ./dist

# Expose port (default 8080, configurable via PORT env var)
EXPOSE 8080

# Set default port
ENV PORT=8080

# Health check using curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Start Astro's generated server
CMD ["node", "./dist/server/entry.mjs"]

