/**
 * API Configuration
 * Centralized API endpoint and configuration management
 *
 * Configuration is loaded from environment variables:
 * - PUBLIC_API_BASE: Backend API base URL (default: http://localhost:8000)
 * - PUBLIC_API_TIMEOUT: Request timeout in ms (default: 30000)
 *
 * To change API endpoints:
 * 1. Update .env file with correct PUBLIC_API_BASE
 * 2. Restart dev server: npm run dev
 * 3. Or rebuild: npm run build
 *
 * Examples:
 * - Development: PUBLIC_API_BASE=http://localhost:8000
 * - Production: PUBLIC_API_BASE=https://api.example.com
 */

import { config } from './validation';

/**
 * Get API base URL from environment or use safe same-origin fallback
 * 
 * Fallback chain (in order of preference):
 * 1. Empty string (same-origin) - uses middleware proxy
 * 2. PUBLIC_API_BASE with PUBLIC_FORCE_API_BASE=true (forced direct URL)
 * 3. Empty string (relative requests for SSR/build-time)
 * 
 * Always use empty string (relative URL) to go through the proxy middleware,
 * which handles both HTTP and HTTPS backends correctly from an HTTPS frontend.
 */
const getApiBase = (): string => {
    const env =
        typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);

    // Get PUBLIC_API_BASE from environment (embedded at build time)
    const publicBase = env.PUBLIC_API_BASE || config.PUBLIC_API_BASE;
    const forceDirect = (env.PUBLIC_FORCE_API_BASE as string | undefined)?.toLowerCase() === "true";

    if (typeof window !== "undefined") {
        console.debug('[API Config]', {
            PUBLIC_API_BASE: publicBase,
            PUBLIC_FORCE_API_BASE: forceDirect,
            windowOrigin: window.location.origin,
            isDev: env?.DEV,
            usingProxy: !forceDirect,
        });
    }

    // Always use same-origin by default (empty string)
    // This routes through the middleware proxy which handles:
    // - Vite dev proxy in development
    // - Node middleware proxy in production
    // - Avoids mixed-content issues (HTTPS frontend → HTTP backend)
    if (!forceDirect) {
        return "";
    }

    // Only use direct URL if explicitly forced
    if (forceDirect && publicBase) {
        return publicBase.replace(/\/$/, "");
    }

    // Fallback: empty string means relative requests
    return "";
};

// Get timeout from environment or use default
const getTimeout = (): number => {
    if (typeof import.meta !== "undefined" && import.meta.env) {
        const timeout = import.meta.env.PUBLIC_API_TIMEOUT;
        if (timeout) {
            const parsed = parseInt(timeout, 10);
            return isNaN(parsed) ? 30000 : parsed;
        }
    }
    return 30000; // 30 seconds default
};

// Make BASE_URL a getter function so it's evaluated at runtime
export const API_CONFIG = {
    get BASE_URL() {
        return getApiBase();
    },
    get TIMEOUT() {
        return getTimeout();
    },
    VERSION: "v1",
} as const;