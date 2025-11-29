/**
 * API Services Index
 * Central export point for all API services
 */

// Core client (exports for browser)
export { apiClient, apiFetch, type ApiResponse } from "./client";

// Server-side client (SSR API routes)
export { serverFetch, createJsonResponse, replacePathParams, type ServerApiResponse, type ServerFetchOptions } from "./server-client";

// Domain services
export { authService } from "./auth-service";
export { healthService } from "./health-service";
export { scanService } from "./scan-service";
export { enrichService } from "./enrich-service";
export { fixService } from "./fix-service";
export { llmService } from "./llm-service";

// Utilities
export { requestDebouncer, RequestDebouncer, type DebounceOptions } from "./request-debounce";