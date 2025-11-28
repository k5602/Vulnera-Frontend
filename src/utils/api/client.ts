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
import { getCookie } from "../cookies";

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
    success?: boolean;
    ok?: boolean;
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
            if (data.csrf || data.csrf_token) {
                setCsrfToken(data.csrf || data.csrf_token);
            }

            if (data.user) {
                setCurrentUser(data.user);
            } else if (data.user_id || data.email) {
                // Map flat structure to CurrentUser
                setCurrentUser({
                    id: data.user_id || data.id,
                    email: data.email,
                    name: data.name || data.first_name, // fallback
                    roles: data.roles || []
                });
            }
        }
    } catch (error) {
        logger.warn("Failed to extract auth data from response", error);
    }
}

export async function apiFetch<T = any>(
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

    // Add Authorization header if auth token exists
    const authToken = getCookie("auth_token");
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    if (isMutating && !skipCsrf) {
        let csrfToken = getCsrfToken();
        console.log("CSRF Token:", csrfToken);

        // If we don't have a CSRF token for a mutating request, try to get one via refresh
        if (!csrfToken) {
            logger.debug("Missing CSRF token for mutating request, attempting refresh");
            await refreshAuth();
            csrfToken = getCsrfToken();
        }

        document.cookie = `csrf_token=${csrfToken}; path=/; SameSite=Lax`;
        if (csrfToken && !headers["X-CSRF-Token"]) {
            headers["X-CSRF-Token"] = csrfToken;
            localStorage.setItem("CSRF_STORAGE_KEY", csrfToken);
            console.log("inside if");
            
        } else {
            logger.warn("Proceeding with mutating request without CSRF token");
        }

        headers["Content-Type"] = "application/json";
    }

    const customHeaders = normalizeHeaders(opts.headers);
    Object.assign(headers, customHeaders);


    // Prevent GET requests from having a body
    if (method === "GET" && opts.body) {
        delete (opts as any).body;
    }

    // Construct full URL with base URL
    const fullUrl = `${API_CONFIG.BASE_URL}${url}`;

    try {
        console.log("API Request",{
            ...opts,
            headers,
            credentials: "include",
        });
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

                // Extract CSRF from response and set as cookie
        if (data?.csrf_token) {
            if (typeof document !== "undefined") {
                document.cookie = `csrf_token=${data.csrf_token}; path=/; SameSite=Strict; Secure`;
            }
            setCsrfToken(data.csrf_token);
        }

        // Also check Set-Cookie header
        const setCookieHeader = res.headers.get("set-cookie");
        if (setCookieHeader && typeof document !== "undefined") {
            // Parse and set individual cookies
            const cookies = setCookieHeader.split(",");
            cookies.forEach(cookie => {
                document.cookie = cookie.trim();
            });
        }


        // Extract and store auth data from response
        extractAndStoreAuthData(res, data);

        // Handle 401 Unauthorized (Token Expired)
        // if (res.status === 401 && !skipCsrf) {
        //     logger.debug("Received 401, attempting token refresh");

        //     // Use the centralized refresh logic (mutex protected)
        //     const refreshed = await refreshAuth();

        //     if (!refreshed) {
        //         logger.warn("Token refresh failed, redirecting to login");
        //         clearAuth();

        //         // Avoid infinite redirect loop
        //         if (
        //             typeof window !== "undefined" &&
        //             !window.location.pathname.startsWith("/login")
        //         ) {
        //             window.location.replace("/login");
        //         }

        //         return { ok: false, status: 401, error: "Authentication expired" };
        //     }

        //     logger.debug("Token refresh successful, retrying request");

        //     // Update CSRF token for the retry
        //     if (isMutating) {
        //         headers["X-CSRF-Token"] = getCsrfToken();
        //     }

        //     // Retry the request
        //     res = await fetch(fullUrl, {
        //         ...opts,
        //         headers,
        //         credentials: "include",
        //     });

        //     // Parse retry response
        //     let retryData = null;
        //     try {
        //         const text = await res.text();
        //         if (text) {
        //             retryData = JSON.parse(text);
        //         }
        //     } catch (e) {
        //         if (res.status !== 204) {
        //             logger.debug("Failed to parse retry response JSON", {
        //                 url,
        //                 status: res.status,
        //             });
        //         }
        //     }

        //     // Extract auth data from retry response
        //     extractAndStoreAuthData(res, retryData);
        //     data = retryData;
        // }

        // // Handle 403 Forbidden (Permission/Role lost - user should logout)
        // if (res.status === 403 && !skipCsrf) {
        //     logger.warn(`Access forbidden to ${method} ${url} - user permissions changed`);
        //     clearAuth();

        //     if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        //         window.location.replace("/login?reason=forbidden");
        //     }

        //     return { ok: false, status: 403, error: "Access forbidden - please re-authenticate" };
        // }

        // if (!res.ok) {
        //     logger.warn(`API Request failed: ${method} ${url}`, {
        //         status: res.status,
        //         error: data,
        //     });
        // }

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