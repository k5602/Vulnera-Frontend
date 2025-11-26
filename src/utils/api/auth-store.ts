//  store CSRF & User in-memory and in localStorage for persistence
import { API_CONFIG } from "../../config/api";

export interface CurrentUser {
    id: number;
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
        if (stored) csrfTokenStore = stored;

        const userStored = localStorage.getItem(USER_STORAGE_KEY);
        if (userStored) {
            currentUserStore = JSON.parse(userStored);
        }
    } catch (e) {
        console.warn("Failed to restore auth from localStorage", e);
    }
}

// CSRF helpers
export function getCsrfToken(): string {
    if (!csrfTokenStore && !initialized) {
        initializeFromStorage();
    }
    return csrfTokenStore;
}

export function setCsrfToken(token: string): void {
    csrfTokenStore = token;
    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(CSRF_STORAGE_KEY, token);
        } catch (e) {
            console.warn("Failed to persist CSRF token to localStorage", e);
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
            console.warn("Failed to persist user to localStorage", e);
            // Continue anyway - in-memory store still works
        }
    }
}

// Clear auth state
export function clearAuth(): void {
    csrfTokenStore = "";
    currentUserStore = null;
    if (typeof window !== "undefined") {
        try {
            localStorage.removeItem(CSRF_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
        } catch (e) {
            console.warn("Failed to clear auth from localStorage", e);
        }
    }
}

// Check authentication
export function isAuthenticated(): boolean {
    return getCurrentUser() !== null;
}

// Refresh Promise Singleton (Mutex)
let refreshPromise: Promise<boolean> | null = null;

/**
 * Centralized token refresh logic with race condition protection
 * Returns true if refresh was successful, false otherwise
 */
export async function refreshAuth(): Promise<boolean> {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const fullUrl = `${API_CONFIG.BASE_URL}/api/v1/auth/refresh`;

            const res = await fetch(fullUrl, {
                method: "POST",
                credentials: "include",
                headers: { Accept: "application/json" },
            });

            if (!res.ok) {
                clearAuth();
                return false;
            }

            const data = await res.json().catch(() => null);

            if (data?.csrf) setCsrfToken(data.csrf);
            if (data?.user) setCurrentUser(data.user);

            return true;
        } catch (error) {
            console.error("Token refresh failed:", error);
            clearAuth();
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
