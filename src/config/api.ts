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

// Get API base URL from environment or use default
const getApiBase = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Check for PUBLIC_API_BASE from environment variables
    const baseUrl = import.meta.env.PUBLIC_API_BASE;
    if (baseUrl) {
      return baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
  }
  // Fallback default
  return 'http://localhost:8000';
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
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    VERIFY: '/api/v1/auth/verify',
    ME: '/api/v1/auth/me',
  },
  
  // Scan endpoints
  SCAN: {
    CREATE: '/api/v1/scans',
    GET: '/api/v1/scans/:id',
    LIST: '/api/v1/scans',
    DELETE: '/api/v1/scans/:id',
    STATUS: '/api/v1/scans/:id/status',
  },
  
  // Vulnerability endpoints
  VULNERABILITIES: {
    GET: '/api/v1/vulnerabilities/:id',
    LIST: '/api/v1/vulnerabilities',
    SEARCH: '/api/v1/vulnerabilities/search',
  },
  
  // Package endpoints
  PACKAGES: {
    ANALYZE: '/api/v1/packages/analyze',
    LIST: '/api/v1/packages',
  },
} as const;
