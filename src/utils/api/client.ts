/**
 * API Client (HttpOnly Cookies + CSRF)
 * Now with auto-capture of auth data from responses
 */
import {
    getCsrfToken,
    refreshAuth,
    clearAuth,
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

export interface ApiResponse<T = any> {
    ok: boolean;
    status: number;
    data?: T;
    error?: any;
}

/**
 * Extract and store auth data from response
 * Handles both header-based and body-based CSRF tokens
 */
function extractAndStoreAuthData(res: Response, data: any): void {
    try {
        // Extract CSRF from response headers
        const csrfFromHeader = res.headers.get("X-CSRF-Token");
        if (csrfFromHeader) {
            setCsrfToken(csrfFromHeader);
        }

        // Extract auth data from response body
        if (data) {
            if (data.csrf) {
                setCsrfToken(data.csrf);
            }
            if (data.user) {
                setCurrentUser(data.user);
            }
        }
    } catch (error) {
        logger.warn("Failed to extract auth data from response", error);
    }
}

export async function apiFetch<T = any>(
    url: string,
    opts: RequestInit = {},
): Promise<ApiResponse<T>> {
    const method = (opts.method || "GET").toUpperCase();
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    const headers = {
        ...normalizeHeaders(opts.headers),
        Accept: "application/json",
    } as Record<string, string>;

    if (isMutating) {
        let csrfToken = getCsrfToken();

        // If we don't have a CSRF token for a mutating request, try to get one via refresh
        if (!csrfToken) {
            logger.debug("Missing CSRF token for mutating request, attempting refresh");
            await refreshAuth();
            csrfToken = getCsrfToken();
        }

        if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        } else {
            logger.warn("Proceeding with mutating request without CSRF token");
        }

        headers["Content-Type"] = "application/json";
    }

    // Prevent GET requests from having a body
    if (method === "GET" && opts.body) {
        delete (opts as any).body;
    }

    // Construct full URL with base URL
    const fullUrl = `${API_CONFIG.BASE_URL}${url}`;

    try {
        // First request attempt
        let res = await fetch(fullUrl, {
            ...opts,
            headers,
            credentials: "include",
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

        // Extract and store auth data from response
        extractAndStoreAuthData(res, data);

        // Handle 401 Unauthorized (Token Expired)
        if (res.status === 401) {
            logger.debug("Received 401, attempting token refresh");

            // Use the centralized refresh logic (mutex protected)
            const refreshed = await refreshAuth();

            if (!refreshed) {
                logger.warn("Token refresh failed, redirecting to login");
                clearAuth();

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
                headers["X-CSRF-Token"] = getCsrfToken();
            }

            // Retry the request
            res = await fetch(fullUrl, {
                ...opts,
                headers,
                credentials: "include",
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

        if (!res.ok) {
            logger.warn(`API Request failed: ${method} ${url}`, {
                status: res.status,
                error: data,
            });
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
    get: <T = any>(url: string) => apiFetch<T>(url),
    post: <T = any>(url: string, body?: any) =>
        apiFetch<T>(url, {
            method: "POST",
            body: JSON.stringify(body || {}),
        }),
    put: <T = any>(url: string, body?: any) =>
        apiFetch<T>(url, {
            method: "PUT",
            body: JSON.stringify(body || {}),
        }),
    delete: <T = any>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
    patch: <T = any>(url: string, body?: any) =>
        apiFetch<T>(url, {
            method: "PATCH",
            body: JSON.stringify(body || {}),
        }),
};
