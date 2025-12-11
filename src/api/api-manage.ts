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

const BASE_URL = import.meta.env.VITE_API_URL;

// CSRF token storage (in-memory)
let csrfToken: string | null = null;

export const setCsrfToken = (token: string) => {
  csrfToken = token;
};

export const clearCsrfToken = () => {
  csrfToken = null;
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // VERY IMPORTANT for cookie-based auth
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();

    // Add CSRF token to unsafe methods
    const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"];

    if (requiresCsrf.includes(method!) && csrfToken) {
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

    // 401 Unauthorized → user must log in
    if (error.response.status === 401) {
      clearCsrfToken();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// API HELPERS
export const GET = (url: string, config?: any) => api.get(url, config);
export const POST = (url: string, data?: any, config?: any) =>
  api.post(url, data, config);
export const PATCH = (url: string, data?: any, config?: any) =>
  api.patch(url, data, config);
export const DELETE = (url: string, config?: any) => api.delete(url, config);

export default api;
