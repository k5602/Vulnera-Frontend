//  store CSRF & User in-memory 
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


// CSRF helpers 
export function getCsrfToken(): string {
  return csrfTokenStore;
}

export function setCsrfToken(token: string): void {
  csrfTokenStore = token;
}


// User helpers 
export function getCurrentUser(): CurrentUser | null {
  return currentUserStore;
}

export function setCurrentUser(user: CurrentUser | null): void {
  currentUserStore = user;
}


// Clear auth state 
export function clearAuth(): void {
  csrfTokenStore = "";
  currentUserStore = null;
}


// Check authentication 
export function isAuthenticated(): boolean {
  return currentUserStore !== null;
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
        headers: { "Accept": "application/json" }
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