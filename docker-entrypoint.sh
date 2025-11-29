#!/bin/sh
set -e

# Default internal port for Astro (Dockerfile provides ENV PORT=3000 in production)
PORT=${PORT:-3000}
# ASTRO_PORT used in nginx template (defaults to PORT)
ASTRO_PORT=${ASTRO_PORT:-$PORT}

# Get backend URL from environment (fallback to localhost:8000 if not set)
BACKEND_URL="${PUBLIC_API_BASE:-http://localhost:8000}"

echo "[docker-entrypoint] Using BACKEND_URL: $BACKEND_URL"

# Parse BACKEND_URL to extract host and port
# Remove protocol (http:// or https://)
BACKEND_NOPROTOCOL=$(echo "$BACKEND_URL" | sed 's|^https://||; s|^http://||')

# Extract host (before : or /)
BACKEND_URL_HOST=$(echo "$BACKEND_NOPROTOCOL" | sed 's|:.*||; s|/.*||')

# Extract port (after : if present, before / if present)
if echo "$BACKEND_NOPROTOCOL" | grep -q ':'; then
    BACKEND_URL_PORT=$(echo "$BACKEND_NOPROTOCOL" | sed 's|^[^:]*:||; s|/.*||')
else
    # Default port based on protocol
    if echo "$BACKEND_URL" | grep -q '^https://'; then
        BACKEND_URL_PORT=443
    else
        BACKEND_URL_PORT=80
    fi
fi

echo "[docker-entrypoint] Backend host: $BACKEND_URL_HOST, port: $BACKEND_URL_PORT"

# Create nginx config from template using sed (more reliable than envsubst)
sed -e "s|\${BACKEND_URL_HOST}|$BACKEND_URL_HOST|g" \
    -e "s|\${BACKEND_URL_PORT}|$BACKEND_URL_PORT|g" \
    -e "s|\${ASTRO_PORT}|$ASTRO_PORT|g" \
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[docker-entrypoint] Nginx config created"
echo "[docker-entrypoint] Using ASTRO_PORT: $ASTRO_PORT (internal) PORT env: $PORT"

# Verify Astro entry point exists
if [ ! -f "/app/dist/server/entry.mjs" ]; then
    echo "[docker-entrypoint] ERROR: Astro build output not found at /app/dist/server/entry.mjs"
    echo "[docker-entrypoint] Available files in /app/dist:"
    ls -la /app/dist 2>/dev/null || echo "  (dist directory not found)"
    exit 1
fi

echo "[docker-entrypoint] Starting Astro server on port $PORT..."
# Create a log file to capture Astro output
ASTRO_LOG="/tmp/astro-server.log"
: > "$ASTRO_LOG"

# Start Astro app in background and capture output
PORT=$PORT node /app/dist/server/entry.mjs > "$ASTRO_LOG" 2>&1 &
ASTRO_PID=$!
echo "[docker-entrypoint] Astro server started (PID: $ASTRO_PID)"

# Give Astro initial time to start
sleep 3

# Check if process is still alive
if ! kill -0 $ASTRO_PID 2>/dev/null; then
    echo "[docker-entrypoint] ERROR: Astro process exited immediately"
    echo "[docker-entrypoint] Astro output:"
    cat "$ASTRO_LOG"
    exit 1
fi

# Wait for Astro to be ready (max 90 seconds)
echo "[docker-entrypoint] Waiting for Astro to be ready (max 90 seconds)..."
MAX_RETRIES=90
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    # Check if Astro process is still running
    if ! kill -0 $ASTRO_PID 2>/dev/null; then
        echo "[docker-entrypoint] ERROR: Astro process died unexpectedly (PID: $ASTRO_PID)"
        echo "[docker-entrypoint] Astro output:"
        cat "$ASTRO_LOG" | tail -30
        exit 1
    fi

    # Try to connect to Astro with curl
    if curl -sf http://localhost:$PORT/ >/dev/null 2>&1; then
        echo "[docker-entrypoint] ✓ Astro is ready!"
        break
    fi

    RETRY=$((RETRY + 1))
    if [ $((RETRY % 15)) -eq 0 ]; then
        echo "[docker-entrypoint] Still waiting... ($RETRY/$MAX_RETRIES seconds)"
    fi

    sleep 1
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "[docker-entrypoint] ERROR: Astro server failed to start within $MAX_RETRIES seconds"
    echo "[docker-entrypoint] Astro output:"
    cat "$ASTRO_LOG" | tail -50
    exit 1
fi

echo "[docker-entrypoint] Astro server ready after $RETRY seconds"
echo "[docker-entrypoint] Starting nginx on port 5173..."
# Start nginx in foreground to keep container running
exec nginx -g "daemon off;"
