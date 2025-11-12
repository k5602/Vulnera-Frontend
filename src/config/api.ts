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
 * 1. PUBLIC_API_BASE with PUBLIC_FORCE_API_BASE=true (forced direct URL)
 * 2. Same-origin in browser during local dev (unless forced)
 * 3. PUBLIC_API_BASE from config (if provided)
 * 4. Same-origin in browser (if available)
 * 5. Empty string (relative requests for SSR/build-time)
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
            importMetaEnv: env.PUBLIC_API_BASE,
            configValue: config.PUBLIC_API_BASE,
            windowOrigin: window.location.origin,
        });
    }

    // Priority 1: If PUBLIC_API_BASE is explicitly set, use it (especially in production)
    if (publicBase && publicBase !== 'http://localhost:8000') {
        // If forceDirect is true, always use it
        if (forceDirect) {
            return publicBase.replace(/\/$/, "");
        }
        
        // In production (non-dev), always use PUBLIC_API_BASE if it's not the default
        if (typeof window !== "undefined") {
            const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
            // If not localhost, use the configured API base
            if (!isLocalhost) {
                return publicBase.replace(/\/$/, "");
            }
            // Even on localhost, if PUBLIC_API_BASE is set and not default, use it
            if (publicBase && publicBase !== 'http://localhost:8000') {
                return publicBase.replace(/\/$/, "");
            }
        } else {
            // SSR/build-time: if PUBLIC_API_BASE is set, use it
            return publicBase.replace(/\/$/, "");
        }
    }

    // Priority 2: In the browser during local dev, prefer same-origin
    if (typeof window !== "undefined") {
        const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
        const isDev = !!env?.DEV || isLocalhost;
        if (isDev && !forceDirect) {
            return window.location.origin.replace(/\/$/, "");
        }
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

export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        LOGIN: "/api/v1/auth/login",
        REGISTER: "/api/v1/auth/register",
        REFRESH: "/api/v1/auth/refresh",
        LIST_API_KEYS: "/api/v1/auth/api-keys",
        CREATE_API_KEY: "/api/v1/auth/api-keys",
        REVOKE_API_KEY: "/api/v1/auth/api-keys/:key_id",
    },

    // Analysis endpoints
    ANALYSIS: {
        ANALYZE: "/api/v1/analyze/job",
        ANALYZE_DEPENDENCIES: "/api/v1/dependencies/analyze",
        GET_JOB: "/api/v1/analyze/job/:job_id",
    },

    // Health endpoints
    HEALTH: {
        CHECK: "/health",
        METRICS: "/metrics",
    },
} as const;
