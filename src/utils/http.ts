import axios, { AxiosError, AxiosHeaders } from 'axios';

// Basic shape for API errors
export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

// Read base URL from Astro public env (exposed to client). Fallback to relative.
const baseURL = (import.meta as any)?.env?.PUBLIC_API_BASE_URL ?? '/api';

// Create a pre-configured Axios instance
const http = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach Authorization header from localStorage using AxiosHeaders for TS safety
http.interceptors.request.use((config) => {
  try {
    const headers = new AxiosHeaders(config.headers);
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    config.headers = headers;
  } catch (_) {
    // ignore storage/header errors
  }
  return config;
});

// Normalize errors and handle 401
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      try { window.localStorage.removeItem('token'); } catch (_) {}
    }
    const message =
      (error?.response?.data as any)?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default http;
