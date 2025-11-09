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
 * - Staging: PUBLIC_API_BASE=https://staging-api.example.com
 * - Production: PUBLIC_API_BASE=https://api.example.com
 */

// Get API base URL from environment or use safe same-origin fallback
const getApiBase = (): string => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);
  const publicBase = env.PUBLIC_API_BASE as string | undefined;
  const forceDirect = (env.PUBLIC_FORCE_API_BASE as string | undefined)?.toLowerCase() === 'true';

  // If PUBLIC_API_BASE is set and forceDirect is true, use it directly
  if (publicBase && forceDirect) {
    return publicBase.replace(/\/$/, '');
  }

  // In the browser during local dev, prefer same-origin (for proxy)
  if (typeof window !== 'undefined') {
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    const isDev = !!env?.DEV || isLocalhost;
    if (isDev && !forceDirect) {
      return window.location.origin.replace(/\/$/, '');
    }
  }

  // Otherwise, use configured public base if provided
  if (publicBase) {
    return publicBase.replace(/\/$/, '');
  }

  // Last resort, same-origin if available
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  // SSR/build-time fallback: empty string means relative requests
  return '';
};

// Get timeout from environment or use default
const getTimeout = (): number => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const timeout = import.meta.env.PUBLIC_API_TIMEOUT;
    if (timeout) {
      const parsed = parseInt(timeout, 10);
      return isNaN(parsed) ? 30000 : parsed;
    }
  }
  return 30000; // 30 seconds default
};

export const API_CONFIG = {
  BASE_URL: getApiBase(),
  TIMEOUT: getTimeout(),
  VERSION: 'v1',
} as const;

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    LIST_API_KEYS: '/api/v1/auth/api-keys',
    CREATE_API_KEY: '/api/v1/auth/api-keys',
    REVOKE_API_KEY: '/api/v1/auth/api-keys/:key_id',
    UPDATE_ME: '/api/v1/auth/me',
  },
  
  // Analysis endpoints
  ANALYSIS: {
    ANALYZE: '/api/v1/analyze/job',
    ANALYZE_DIRECT: '/api/v1/analyze',
    GET_JOB: '/api/v1/analyze/job/:job_id',
    POPULAR: '/api/v1/popular',
    GET_REPORT: '/api/v1/reports/:id',
  },
  
  // Vulnerability endpoints
  VULNERABILITIES: {
    LIST: '/api/v1/vulnerabilities',
    GET: '/api/v1/vulnerabilities/:id',
    REFRESH_CACHE: '/api/v1/vulnerabilities/refresh-cache',
  },

  // Repository endpoints
  REPOSITORY: {
    ANALYZE: '/api/v1/analyze/repository',
  },

  // Health endpoints
  HEALTH: {
    CHECK: '/health',
    METRICS: '/metrics',
  },
} as const;
