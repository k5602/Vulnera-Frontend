/**
 * Server-Side API Client
 * SSR-safe fetch helper for Astro API routes
 * Forwards cookies and CSRF tokens from incoming request to backend
 * 
 * Use this in Astro API routes (src/pages/api/v1/**) instead of raw fetch()
 * to ensure consistent cookie/CSRF handling.
 */

import { API_ENDPOINTS } from '../../config/api';
import { logger } from '../logger';

export interface ServerFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface ServerApiResponse<T = unknown> {
    /** HTTP ok status (true if status is 200-299) */
    ok: boolean;
    /** HTTP status code */
    status: number;
    /** Response data (only present if request was successful) */
    data?: T;
    /** Error data (only present if request failed) */
    error?: unknown;
    /** Response headers from backend (useful for forwarding CSRF tokens) */
    headers?: Headers;
}

/**
 * Get backend base URL from environment
 */
function getBackendBaseUrl(): string | null {
    const base = process.env.PUBLIC_API_BASE;
    if (!base) return null;
    return base.replace(/\/$/, ''); // Remove trailing slash
}

/**
 * SSR-safe fetch that forwards cookies and CSRF from incoming request
 * Use this in Astro API routes (src/pages/api/v1/**) instead of raw fetch()
 * 
 * @param incomingRequest - The incoming Request from Astro context
 * @param endpoint - The backend API endpoint (e.g., API_ENDPOINTS.LLM.EXPLAIN)
 * @param options - Fetch options (method, body, headers)
 * @returns ServerApiResponse with typed data
 * 
 * @example
 * ```typescript
 * export const POST: APIRoute = async ({ request }) => {
 *   const body = await request.json();
 *   const response = await serverFetch<ExplainResponse>(
 *     request,
 *     API_ENDPOINTS.LLM.EXPLAIN,
 *     { method: 'POST', body }
 *   );
 *   
 *   if (!response.ok) {
 *     return new Response(JSON.stringify({ error: response.error }), { status: response.status });
 *   }
 *   
 *   return new Response(JSON.stringify(response.data), { status: response.status });
 * };
 * ```
 */
export async function serverFetch<T = unknown>(
    incomingRequest: Request,
    endpoint: string,
    options: ServerFetchOptions = {}
): Promise<ServerApiResponse<T>> {
    const baseUrl = getBackendBaseUrl();

    if (!baseUrl) {
        logger.warn('[serverFetch] PUBLIC_API_BASE not configured');
        return {
            ok: false,
            status: 503,
            error: 'Backend not configured (set PUBLIC_API_BASE)',
        };
    }

    const method = options.method || 'GET';
    const fullUrl = `${baseUrl}${endpoint}`;

    // Build headers - forward cookies and CSRF from incoming request
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
    };

    // Forward cookies from incoming request
    const cookieHeader = incomingRequest.headers.get('cookie');
    if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
    }

    // Forward CSRF token from incoming request header
    const csrfToken = incomingRequest.headers.get('X-CSRF-Token');
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    try {
        logger.debug('[serverFetch] Request', { url: fullUrl, method });

        const fetchOptions: RequestInit = {
            method,
            headers,
            credentials: 'include',
        };

        // Add body for non-GET requests
        if (method !== 'GET' && options.body !== undefined) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(fullUrl, fetchOptions);

        // Parse response body
        let data: T | null = null;
        try {
            const text = await response.text();
            if (text) {
                data = JSON.parse(text);
            }
        } catch {
            if (response.status !== 204) {
                logger.debug('[serverFetch] Failed to parse response JSON', {
                    url: fullUrl,
                    status: response.status
                });
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            data: data ?? undefined,
            error: !response.ok ? data : undefined,
            headers: response.headers,
        };
    } catch (error) {
        logger.error('[serverFetch] Network error', {
            url: fullUrl,
            error: error instanceof Error ? error.message : String(error)
        });
        return {
            ok: false,
            status: 0,
            error: 'Network error',
        };
    }
}

/**
 * Helper to replace path parameters in endpoint templates
 * @param template - Endpoint template (e.g., '/api/v1/jobs/:job_id/enrich')
 * @param params - Parameter values (e.g., { job_id: '123' })
 * @returns Endpoint with parameters replaced
 * 
 * @example
 * ```typescript
 * const endpoint = replacePathParams(API_ENDPOINTS.LLM.ENRICH, { job_id: '123' });
 * // => '/api/v1/jobs/123/enrich'
 * ```
 */
export function replacePathParams(template: string, params: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, encodeURIComponent(value));
    }
    return result;
}

/**
 * Create a standardized Response object from ServerApiResponse
 * Useful for returning consistent responses in API routes
 */
export function createJsonResponse<T>(
    response: ServerApiResponse<T>,
    additionalHeaders?: Record<string, string>
): Response {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders,
    };

    // Forward CSRF token from backend response if present
    const csrfToken = response.headers?.get('X-CSRF-Token');
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    const body = response.ok ? response.data : { error: response.error };

    return new Response(JSON.stringify(body), {
        status: response.status,
        headers,
    });
}

// Re-export API_ENDPOINTS for convenience in API routes
export { API_ENDPOINTS };
