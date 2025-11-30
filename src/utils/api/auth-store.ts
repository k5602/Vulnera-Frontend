//  store CSRF & User in-memory and in localStorage for persistence
import { API_CONFIG } from "../../config/api";
import { logger } from "../logger";

export interface CurrentUser {
    id: number | string;
    email: string;
    name?: string;
    roles?: string[];
}

// CSRF Token
let csrfTokenStore: string = "";

// Current User
let currentUserStore: CurrentUser | null = null;

// Storage keys
const CSRF_STORAGE_KEY = "__vulnera_csrf_token";
const USER_STORAGE_KEY = "__vulnera_current_user";

// Flag to track if we've attempted to initialize from storage
let initialized = false;

/**
 * Safely initialize from localStorage (called once, lazily)
 */
function initializeFromStorage(): void {
    if (initialized) return;
    initialized = true;

    if (typeof window === "undefined") return;

    try {
        const stored = localStorage.getItem(CSRF_STORAGE_KEY);
        if (stored) {
            csrfTokenStore = stored;
            const tokenPreview = stored ? `${stored.substring(0, 10)}...` : "empty";
            logger.debug(`[CSRF Debug] initializeFromStorage: restored CSRF token=${tokenPreview}`);
        } else {
            logger.debug(`[CSRF Debug] initializeFromStorage: no CSRF token in localStorage`);
        }

        const userStored = localStorage.getItem(USER_STORAGE_KEY);
        if (userStored) {
            currentUserStore = JSON.parse(userStored);
            logger.debug(`[CSRF Debug] initializeFromStorage: restored user data`);
        } else {
            logger.debug(`[CSRF Debug] initializeFromStorage: no user data in localStorage`);
        }
    } catch (e) {
        logger.warn(
            `[CSRF Debug] Failed to restore auth from localStorage: ${e instanceof Error ? e.message : String(e)}`,
        );
    }
}

// CSRF helpers
export function getCsrfToken(): string {
    if (!csrfTokenStore && !initialized) {
        initializeFromStorage();
    }

    // Debug logging: track CSRF token retrieval
    if (typeof window !== "undefined") {
        const hasToken = !!csrfTokenStore;
        const timestamp = new Date().toISOString();
        if (!hasToken) {
            logger.debug(
                `[CSRF Debug ${timestamp}] getCsrfToken: no token in store (initialized=${initialized})`,
            );
        }
    }

    return csrfTokenStore;
}

export function setCsrfToken(token: string): void {
    const oldToken = csrfTokenStore;
    csrfTokenStore = token;

    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(CSRF_STORAGE_KEY, token);
            const timestamp = new Date().toISOString();
            const tokenPreview = token ? `${token.substring(0, 10)}...` : "empty";
            logger.debug(
                `[CSRF Debug ${timestamp}] setCsrfToken: stored token=${tokenPreview} (changed=${oldToken !== token})`,
            );
        } catch (e) {
            logger.warn(
                `[CSRF Debug] Failed to persist CSRF token to localStorage: ${e instanceof Error ? e.message : String(e)}`,
            );
            // Continue anyway - in-memory store still works
        }
    }
}

// User helpers
export function getCurrentUser(): CurrentUser | null {
    if (!currentUserStore && !initialized) {
        initializeFromStorage();
    }
    return currentUserStore;
}

export function setCurrentUser(user: CurrentUser | null): void {
    currentUserStore = user;
    if (typeof window !== "undefined") {
        try {
            if (user) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        } catch (e) {
            logger.warn("Failed to persist user to localStorage", e);
            // Continue anyway - in-memory store still works
        }
    }
}

// Clear auth state
export function clearAuth(): void {
    const hadCSRF = !!csrfTokenStore;
    const hadUser = !!currentUserStore;

    csrfTokenStore = "";
    currentUserStore = null;

    if (typeof window !== "undefined") {
        try {
            localStorage.removeItem(CSRF_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
            logger.debug(
                `[CSRF Debug] clearAuth: cleared storage (hadCSRF=${hadCSRF}, hadUser=${hadUser})`,
            );
        } catch (e) {
            logger.warn(
                `[CSRF Debug] Failed to clear auth from localStorage: ${e instanceof Error ? e.message : String(e)}`,
            );
        }
    }
}

// Check authentication
export function isAuthenticated(): boolean {
    const user = getCurrentUser();
    const authenticated = user !== null;
    if (typeof window !== "undefined") {
        logger.debug(
            `[CSRF Debug] isAuthenticated check: ${authenticated} (user=${user?.email || "none"})`,
        );
    }
    return authenticated;
}

// Refresh Promise Singleton (Mutex)
let refreshPromise: Promise<boolean> | null = null;

/**
 * Centralized token refresh logic with race condition protection
 * Returns true if refresh was successful, false otherwise
 *
 * NOTE: This handles the bootstrap case where CSRF token might be missing
 * by making a direct fetch() call. The backend should allow /auth/refresh
 * without CSRF validation if the session cookie is valid.
 *
 * For subsequent requests after bootstrap, apiFetch will handle retries properly.
 */
export async function refreshAuth(): Promise<boolean> {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const fullUrl = `${API_CONFIG.BASE_URL}/api/v1/auth/refresh`;

            const headers: Record<string, string> = {
                Accept: "application/json",
                "Content-Type": "application/json",
            };

            // Attach CSRF token if available (optional for this endpoint)
            // Backend should allow refresh without CSRF if session cookie is valid
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                headers["X-CSRF-Token"] = csrfToken;
                logger.debug("Token refresh: including CSRF token");
            } else {
                logger.debug(
                    "Token refresh: no CSRF token available (bootstrap case), relying on session cookie",
                );
            }

            const res = await fetch(fullUrl, {
                method: "POST",
                credentials: "include", // ✅ Browser sends HttpOnly session cookie automatically
                headers,
            });

            if (!res.ok) {
                // Don't clear auth on 429 (Rate Limit) or 5xx (Server Error)
                if (res.status === 429 || res.status >= 500) {
                    logger.warn(
                        `Token refresh failed with status ${res.status}, keeping current session`,
                    );
                    return false;
                }

                // 401/403 means session is invalid, clear auth
                if (res.status === 401 || res.status === 403) {
                    logger.warn(`Token refresh failed with status ${res.status}, clearing auth`);
                    clearAuth();
                    return false;
                }

                logger.warn(`Token refresh failed with unexpected status ${res.status}`);
                return false;
            }

            const data = await res.json().catch(() => null);

            if (!data) {
                logger.warn("Token refresh: empty response body");
                return false;
            }

            // Extract and store CSRF token from response
            if (data?.csrf || data?.csrf_token) {
                const newToken = data.csrf || data.csrf_token;
                setCsrfToken(newToken);
                logger.debug("Token refresh: extracted new CSRF token");
            }

            // Handle both nested 'user' object and flat structure
            if (data?.user) {
                setCurrentUser(data.user);
                logger.debug("Token refresh: updated user from nested object");
            } else if (data?.user_id || data?.email) {
                // Map flat structure to CurrentUser
                setCurrentUser({
                    id: data.user_id || data.id,
                    email: data.email,
                    name: data.name || data.first_name,
                    roles: data.roles || [],
                });
                logger.debug("Token refresh: updated user from flat structure");
            }

            logger.debug("Token refresh: successful");
            return true;
        } catch (error) {
            logger.error("Token refresh: network error", error);
            // Don't clear auth on network errors (offline, etc)
            // User might be able to recover
            return false;
        } finally {
            // Reset the promise so subsequent calls can trigger a new refresh
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// Initialize session (alias for refreshAuth for backward compatibility if needed,
// but better to switch usages to refreshAuth)
export async function initAuth(): Promise<void> {
    await refreshAuth();
}

/**
 * @internal Test helper - resets storage initialization flag for testing
 * DO NOT use in production code
 */
export function __resetStorageInitFlag(): void {
    initialized = false;
    csrfTokenStore = "";
    currentUserStore = null;
}
