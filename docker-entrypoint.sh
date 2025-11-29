#!/bin/sh
set -e

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
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "[docker-entrypoint] Starting Astro server on port 3000..."
# Start Astro app in background
node /app/dist/server/entry.mjs &
ASTRO_PID=$!
echo "[docker-entrypoint] Astro server started (PID: $ASTRO_PID)"

# Wait for Astro to be ready (max 60 seconds with exponential backoff)
echo "[docker-entrypoint] Waiting for Astro to be ready..."
MAX_RETRIES=60
RETRY=0
WAIT_TIME=1

while [ $RETRY -lt $MAX_RETRIES ]; do
    # Check if Astro process is still running
    if ! kill -0 $ASTRO_PID 2>/dev/null; then
        echo "[docker-entrypoint] ERROR: Astro process died unexpectedly (PID: $ASTRO_PID)"
        # Print last 50 lines of logs for debugging
        echo "[docker-entrypoint] Last output before crash:"
        sleep 2
        exit 1
    fi

    # Try to connect to Astro with curl (more robust than wget)
    if curl -sf http://localhost:3000/ >/dev/null 2>&1; then
        echo "[docker-entrypoint] ✓ Astro is ready!"
        break
    fi

    RETRY=$((RETRY + 1))
    if [ $((RETRY % 10)) -eq 0 ]; then
        echo "[docker-entrypoint] Retry $RETRY/$MAX_RETRIES - waiting for Astro to initialize..."
    fi

    sleep $WAIT_TIME
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "[docker-entrypoint] ERROR: Astro server failed to start within $((MAX_RETRIES * WAIT_TIME)) seconds"
    echo "[docker-entrypoint] Checking if Astro process is still alive..."
    if kill -0 $ASTRO_PID 2>/dev/null; then
        echo "[docker-entrypoint] Astro process is running but not responding to HTTP requests"
        echo "[docker-entrypoint] Trying to get process info..."
        ps aux | grep -i astro || true
    fi
    exit 1
fi

echo "[docker-entrypoint] Astro is ready!"
echo "[docker-entrypoint] Starting nginx on port 5173..."
# Start nginx in foreground to keep container running
exec nginx -g "daemon off;"
