// Session monitoring utility
// Checks if the user's session is still valid and redirects to login if expired

import { userStore, clearStore } from './store';
import { POST } from '../api/api-manage';
import ENDPOINTS from './api/endpoints';

let sessionCheckInterval: number | null = null;
let isCheckingSession = false;

/**
 * Check if session is still valid by pinging the backend
 */
async function checkSessionValidity(): Promise<boolean> {
  if (isCheckingSession) return true; // Prevent concurrent checks
  
  isCheckingSession = true;
  
  try {
    // Try to refresh/validate session with backend
    const response = await POST(ENDPOINTS.AUTH.POST_refresh_token, {});
    
    // If successful, session is still valid
    return response.status === 200;
  } catch (error: any) {
    // 401 means session expired - the interceptor will handle redirect
    if (error?.response?.status === 401) {
      return false;
    }
    
    // For other errors, assume session is still valid (network issues, etc.)
    console.warn('[Session Monitor] Session check failed:', error);
    return true;
  } finally {
    isCheckingSession = false;
  }
}

/**
 * Handle session expiration
 */
function handleSessionExpired(): void {
  console.warn('[Session Monitor] Session expired, redirecting to login');
  
  // Clear all auth data
  clearStore();
  
  // Redirect to login with return URL
  const currentPath = window.location.pathname;
  const returnUrl = currentPath !== '/login' ? `?next=${encodeURIComponent(currentPath)}` : '';
  window.location.href = `/login${returnUrl}`;
}

/**
 * Start monitoring the user's session
 * Checks every 5 minutes if the session is still valid
 */
export function startSessionMonitor(): void {
  // Only start if user is authenticated
  const user = userStore.get();
  if (!user) return;
  
  // Clear any existing interval
  if (sessionCheckInterval !== null) {
    window.clearInterval(sessionCheckInterval);
  }
  
  console.log('[Session Monitor] Started');
  
  // Check immediately
  checkSessionValidity().then(isValid => {
    if (!isValid) {
      handleSessionExpired();
    }
  });
  
  // Check every 5 minutes
  sessionCheckInterval = window.setInterval(async () => {
    const isValid = await checkSessionValidity();
    if (!isValid) {
      handleSessionExpired();
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop monitoring the user's session
 */
export function stopSessionMonitor(): void {
  if (sessionCheckInterval !== null) {
    window.clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
    console.log('[Session Monitor] Stopped');
  }
}

/**
 * Initialize session monitoring when page loads
 */
if (typeof window !== 'undefined') {
  // Start on page load
  window.addEventListener('DOMContentLoaded', () => {
    const user = userStore.get();
    if (user) {
      startSessionMonitor();
    }
  });
  
  // Subscribe to auth changes
  userStore.subscribe((user) => {
    if (user) {
      startSessionMonitor();
    } else {
      stopSessionMonitor();
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', stopSessionMonitor);
}
