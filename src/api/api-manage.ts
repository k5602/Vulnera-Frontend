/**
 * api-manage.ts
 * Axios instance for Vulnera API (Cookie-based Authentication)
 *
 * - Access/Refresh tokens are HttpOnly cookies → browser sends them automatically
 * - CSRF token MUST be added manually to state-changing requests (POST/PUT/DELETE)
 * - CSRF token returned from:
 *      - POST /api/v1/auth/login
 *      - POST /api/v1/auth/register
 *      - POST /api/v1/auth/refresh
 *
 * Usage:
 * import api, { GET, POST, PATCH, DELETE, setCsrfToken } from "@/api/api-manage";
 */


import axios from "axios";
import { clearStore, csrfTokenStore } from "../utils/store";
import ENDPOINTS from "../utils/api/endpoints";

const BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshingCsrf = false;

// Helper: Refresh CSRF token from backend
async function refreshCsrfToken(): Promise<string | null> {
  if (isRefreshingCsrf) return null;
  
  isRefreshingCsrf = true;
  try {
    // Use relative path when BASE_URL is undefined to go through dev proxy
    const refreshUrl = ENDPOINTS.AUTH.POST_refresh_token;
    
    const response = await axios.post(
      refreshUrl,
      {},
      { 
        withCredentials: true,
        baseURL: BASE_URL || '',
      }
    );
    
    const csrfToken = response.data?.csrf_token || response.headers['x-csrf-token'];
    if (csrfToken) {
      csrfTokenStore.set(csrfToken);
      console.log('✓ CSRF token refreshed');
      return csrfToken;
    }
    return null;
  } catch (error) {
    console.error('✗ Failed to refresh CSRF token:', error);
    return null;
  } finally {
    isRefreshingCsrf = false;
  }
}

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toUpperCase();
    const url = config.url || "";

    // Exclude CSRF for Login, Register, and Refresh
    const EXCLUDED_CSRF_ENDPOINTS = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/refresh",
    ];

    const isExcluded = EXCLUDED_CSRF_ENDPOINTS.some((endpoint) =>
      url.includes(endpoint)
    );

    // Add CSRF token to unsafe methods
    const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"];

    if (requiresCsrf.includes(method!) && !isExcluded) {
      // Read CSRF token dynamically from store
      let csrfToken = csrfTokenStore.get();
      
      // If missing, try to refresh it
      if (!csrfToken) {
        console.warn('⚠ CSRF token missing, attempting refresh...');
        csrfToken = await refreshCsrfToken();
        
        if (!csrfToken) {
          console.error('✗ Could not obtain CSRF token, request may fail');
        }
      }
      
      if (csrfToken) {
        if (config.headers && typeof config.headers.set === "function") {
          config.headers.set("X-CSRF-Token", csrfToken);
        } else {
          config.headers["X-CSRF-Token"] = csrfToken;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (!error.response) return Promise.reject(error);

    // 401 Unauthorized → session expired, redirect to login
    if (error.response.status === 401) {
      console.warn(' Session expired (401), redirecting to login');
      clearStore();
      
      // Preserve the current page for redirect after login
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/login' || currentPath === '/signup' || currentPath === '/orgsignup';
      
      if (!isLoginPage) {
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
      } else {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }

    // 403 Forbidden → possibly CSRF token issue, try refresh once
    if (error.response.status === 403) {
      const errorData = error.response.data;
      const isCsrfError = 
        errorData?.code === 'CSRF_VALIDATION_FAILED' ||
        errorData?.message?.toLowerCase().includes('csrf');
      
      if (isCsrfError && !error.config._csrfRetry) {
        console.warn('⚠ CSRF validation failed, refreshing token and retrying...');
        const newToken = await refreshCsrfToken();
        
        if (newToken) {
          error.config._csrfRetry = true;
          if (error.config.headers) {
            error.config.headers['X-CSRF-Token'] = newToken;
          }
          return api.request(error.config);
        }
      }
      
      console.warn('✗ Access forbidden (403), cannot recover');
    }

    return Promise.reject(error);
  }
);

// API HELPERS
export const GET = (url: string, config?: any) => api.get(url, config);
export const PUT = (url: string, data?: any, config?: any) =>
  api.put(url, data, config);
export const POST = (url: string, data?: any, config?: any) =>
  api.post(url, data, config);
export const PATCH = (url: string, data?: any, config?: any) =>
  api.patch(url, data, config);
export const DELETE = (url: string, config?: any) => api.delete(url, config);

export default api;