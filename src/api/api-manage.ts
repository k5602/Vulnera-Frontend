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

const BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    const url = config.url || "";

    // Exclude CSRF for Login & Register
    // (These endpoints return the token; they don't consume it)
    const EXCLUDED_CSRF_ENDPOINTS = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
    ];

    const isExcluded = EXCLUDED_CSRF_ENDPOINTS.some((endpoint) =>
      url.includes(endpoint)
    );

    // Add CSRF token to unsafe methods
    const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"];

    // Read CSRF token dynamically from store on EVERY request
    const csrfToken = csrfTokenStore.get();

    if (requiresCsrf.includes(method!) && csrfToken && !isExcluded) {
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("X-CSRF-Token", csrfToken);
      } else {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,

  (error) => {
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

    // 403 Forbidden → possibly CSRF token issue
    if (error.response.status === 403) {
      console.warn(' Access forbidden (403), may need to refresh session');
      // Don't auto-redirect on 403, let the calling code handle it
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