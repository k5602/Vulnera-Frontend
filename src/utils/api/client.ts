/**
 * API Client (HttpOnly Cookies + CSRF)
 * Now with auto-capture of auth data from responses
 */
import {
    getCsrfToken,
    refreshAuth,
    setCsrfToken,
    setCurrentUser,
} from "../api/auth-store";
import { API_CONFIG } from "../../config/api";
import { logger } from "../logger";

function normalizeHeaders(init?: HeadersInit): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (!init) return normalized;

    if (init instanceof Headers) {
        init.forEach((v, k) => (normalized[k] = v));
        return normalized;
    }

    if (Array.isArray(init)) {
        init.forEach(([k, v]) => (normalized[k] = v));
        return normalized;
    }

    return { ...init };
}

/**
 * API Response interface for client operations
 * Uses 'ok' as the primary success indicator (aligned with fetch Response.ok)
 */
export interface ApiResponse<T = unknown> {
    /** HTTP ok status (true if status is 200-299) */
    ok: boolean;
    /** HTTP status code */
    status: number;
    /** Response data (only present if request was successful) */
    data?: T;
    /** Error data (only present if request failed) */
    error?: unknown;
}

/**
 * Extract and store auth data from response
 * Handles both header-based and body-based CSRF tokens
 * Header CSRF takes priority over body CSRF
 */
function extractAndStoreAuthData(res: Response, data: unknown): void {
    try {
        // Extract CSRF from response headers (takes priority)
        const csrfFromHeader = res.headers.get("X-CSRF-Token");
        let csrfSet = false;
        if (csrfFromHeader) {
            setCsrfToken(csrfFromHeader);
            csrfSet = true;
        }

        // Extract auth data from response body
        if (data && typeof data === 'object') {
            const responseData = data as Record<string, unknown>;
            // Only set CSRF from body if header didn't provide one
            if (!csrfSet && (responseData.csrf || responseData.csrf_token)) {
                setCsrfToken(String(responseData.csrf || responseData.csrf_token));
            }

            if (responseData.user && typeof responseData.user === 'object') {
                setCurrentUser(responseData.user as Parameters<typeof setCurrentUser>[0]);
            } else if (responseData.user_id || responseData.email) {
                // Map flat structure to CurrentUser
                setCurrentUser({
                    id: responseData.user_id as string || responseData.id as string,
                    email: responseData.email as string,
                    name: (responseData.name || responseData.first_name) as string | undefined,
                    roles: (responseData.roles || []) as string[]
                });
            }
        }
    } catch (error) {
        logger.warn("Failed to extract auth data from response", error);
    }
}

export async function apiFetch<T = unknown>(
    url: string,
    opts: RequestInit = {}
): Promise<ApiResponse<T>> {
    const method = (opts.method || "GET").toUpperCase();
    // Do NOT use CSRF for login and register
    const skipCsrf = url.includes("/auth/login") || url.includes("/auth/register");

    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method) && !skipCsrf;


    const headers = {
        ...normalizeHeaders(opts.headers),
        Accept: "application/json",
        "Content-Type": "application/json",
    } as Record<string, string>;

    // Browser will automatically include HttpOnly cookies (like auth_token)
    // when using `credentials: 'include'`. Do NOT try to read HttpOnly cookies
    // from JavaScript and set an Authorization header, as HttpOnly cookies
    // are not accessible via `document.cookie` or helper utilities.

    if (isMutating && !skipCsrf) {
        let csrfToken = getCsrfToken();

        // If we don't have a CSRF token for a mutating request, try to get one via refresh
        if (!csrfToken) {
            logger.debug("Missing CSRF token for mutating request, attempting refresh");
            await refreshAuth();
            csrfToken = getCsrfToken();
        }

        // Add CSRF token to mutating requests as request header. Do not set
        // CSRF as a cookie manually - the backend should set HttpOnly cookie
        // values via Set-Cookie in responses, and the browser will handle them.
        if (csrfToken && !headers["X-CSRF-Token"]) {
            headers["X-CSRF-Token"] = csrfToken;
            localStorage.setItem("__vulnera_csrf_token", csrfToken);
        } else {
            logger.warn("Proceeding with mutating request without CSRF token");
        }

        headers["Content-Type"] = "application/json";
    }

    const customHeaders = normalizeHeaders(opts.headers);
    Object.assign(headers, customHeaders);


    // Prevent GET requests from having a body
    if (method === "GET" && opts.body) {
        delete (opts as Record<string, unknown>).body;
    }

    // Construct full URL with base URL
    const fullUrl = `${API_CONFIG.BASE_URL}${url}`;

    try {
        logger.debug("API Request", { url: fullUrl, method });

        // First request attempt
        let res = await fetch(fullUrl, {
            ...opts,
            headers,
            credentials: opts.credentials || "include",
        });

        // Parse response body once
        let data = null;
        try {
            const text = await res.text();
            if (text) {
                data = JSON.parse(text);
            }
        } catch (e) {
            // Only log if it's not an empty response which is expected for some endpoints
            if (res.status !== 204) {
                logger.debug("Failed to parse response JSON", { url, status: res.status });
            }
        }

        // Extract CSRF from response and store via setCsrfToken (no cookie writing)
        if (data?.csrf_token) {
            setCsrfToken(data.csrf_token);
        }

        // Let the browser handle Set-Cookie headers automatically; do not
        // parse and set cookies from JavaScript. This prevents conflicts with
        // HttpOnly cookies and avoids double-setting values.


        // Extract and store auth data from response
        extractAndStoreAuthData(res, data);

        // Handle 401 Unauthorized (Token Expired)
        if (res.status === 401 && !skipCsrf) {
            logger.debug("Received 401, attempting token refresh");

            // Use the centralized refresh logic (mutex protected)
            let refreshed = false;
            try {
                refreshed = await refreshAuth();
            } catch (refreshError) {
                logger.warn("Token refresh threw an error", refreshError);
            }

            if (!refreshed) {
                logger.warn("Token refresh failed, redirecting to login");

                // Avoid infinite redirect loop
                if (
                    typeof window !== "undefined" &&
                    !window.location.pathname.startsWith("/login")
                ) {
                    window.location.replace("/login");
                }

                return { ok: false, status: 401, error: "Authentication expired" };
            }

            logger.debug("Token refresh successful, retrying request");

            // Update CSRF token for the retry
            if (isMutating) {
                const newCsrfToken = getCsrfToken();
                if (newCsrfToken) {
                    headers["X-CSRF-Token"] = newCsrfToken;
                }
            }

            // Retry the request
            res = await fetch(fullUrl, {
                ...opts,
                headers,
                credentials: opts.credentials || "include",
            });

            // Parse retry response
            let retryData = null;
            try {
                const text = await res.text();
                if (text) {
                    retryData = JSON.parse(text);
                }
            } catch (e) {
                if (res.status !== 204) {
                    logger.debug("Failed to parse retry response JSON", {
                        url,
                        status: res.status,
                    });
                }
            }

            // Extract auth data from retry response
            extractAndStoreAuthData(res, retryData);
            data = retryData;
        }

        return {
            ok: res.ok,
            status: res.status,
            data,
            error: !res.ok ? data : undefined,
        };
    } catch (error) {
        logger.error(`Network error during API request: ${method} ${url}`, error);
        return {
            ok: false,
            status: 0,
            error: "Network error",
        };
    }
}

export const apiClient = {
    get: <T = unknown>(url: string, opts?: RequestInit) => apiFetch<T>(url, opts),
    post: <T = unknown>(url: string, body?: unknown, opts?: RequestInit) =>
        apiFetch<T>(url, {
            ...opts,
            method: "POST",
            body: JSON.stringify(body || {}),
        }),

    put: <T = unknown>(url: string, body?: unknown, opts?: RequestInit) =>
        apiFetch<T>(url, {
            ...opts,
            method: "PUT",
            body: JSON.stringify(body || {}),
        }),
    delete: <T = unknown>(url: string, opts?: RequestInit) => apiFetch<T>(url, { ...opts, method: "DELETE" }),
    patch: <T = unknown>(url: string, body?: unknown, opts?: RequestInit) =>
        apiFetch<T>(url, {
            ...opts,
            method: "PATCH",
            body: JSON.stringify(body || {}),
        }),

    /**
     * Replace path parameters in a URL template
     * @param template - URL template with :param placeholders (e.g., '/api/jobs/:job_id')
     * @param params - Object with parameter values (e.g., { job_id: '123' })
     * @returns URL with parameters replaced (e.g., '/api/jobs/123')
     * 
     * @example
     * apiClient.replacePath('/api/jobs/:job_id', { job_id: '123' })
     * // => '/api/jobs/123'
     */
    replacePath: (template: string, params: Record<string, string>): string => {
        let result = template;
        for (const [key, value] of Object.entries(params)) {
            result = result.replace(`:${key}`, encodeURIComponent(value));
        }
        return result;
    },
};