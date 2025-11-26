/**
 * Auth Guard Utility
 * Protects pages by checking authentication status and redirecting if needed
 */

import { isAuthenticated, getCurrentUser } from './api/auth-store';
import { refreshAuth } from './api/auth-store';

export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireRole?: string[];
  redirectTo?: string;
}

/**
 * Setup auth guard for a page
 * Checks authentication status and redirects if not authenticated
 */
export async function setupAuthGuard(options: AuthGuardOptions = {}): Promise<void> {
  const {
    requireAuth = true,
    requireRole = [],
    redirectTo = '/login'
  } = options;

  // Only run in browser
  if (typeof window === 'undefined') return;

  try {
    // Try to refresh auth state to get latest data
    await refreshAuth().catch(() => {
      // Ignore errors, just continue with current state
    });

    const user = getCurrentUser();
    const isAuth = isAuthenticated();

    // Check if authentication is required but not present
    if (requireAuth && !isAuth) {
      const currentPath = window.location.pathname;
      window.location.replace(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Check if user has required role
    if (requireRole.length > 0 && user) {
      const userRoles = user.roles || [];
      const hasRequiredRole = requireRole.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        console.warn(`User does not have required role. Required: ${requireRole.join(', ')}, Have: ${userRoles.join(', ')}`);
        window.location.replace('/unauthorized');
        return;
      }
    }
  } catch (error) {
    console.error('Auth guard error:', error);
    // On error, redirect to login if auth is required
    if (requireAuth) {
      window.location.replace(redirectTo);
    }
  }
}

/**
 * Check if current user is authenticated
 */
export function checkAuth(): boolean {
  return isAuthenticated();
}

/**
 * Get current authenticated user
 */
export function getAuthUser() {
  return getCurrentUser();
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return (user.roles || []).includes(role);
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(roles: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  const userRoles = user.roles || [];
  return roles.some(role => userRoles.includes(role));
}

/**
 * Logout user and redirect to login
 */
export function logout(): void {
  const { clearAuth } = require('./api/auth-store');
  clearAuth();
  window.location.replace('/login');
}
