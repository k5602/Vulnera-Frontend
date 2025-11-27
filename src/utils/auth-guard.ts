/**
 * Auth Guard Utility — FINAL SAFE VERSION
 * No auto refresh
 * No rate-limit hits
 * Simple, stable, predictable
 */

import { isAuthenticated, getCurrentUser } from './api/auth-store';

export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireRole?: string[];
  redirectTo?: string;
}

export async function setupAuthGuard(options: AuthGuardOptions = {}): Promise<void> {
  const {
    requireAuth = true,
    requireRole = [],
    redirectTo = '/login'
  } = options;

  if (typeof window === 'undefined') return;

  // ⚠️ IMPORTANT: Do NOT refresh here (apiClient handles everything)
  const isAuth = isAuthenticated();

  // Not logged in?
  if (requireAuth && !isAuth) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.replace(`${redirectTo}?next=${next}`);
    return;
  }

  // Role check
  const user = getCurrentUser();
  if (requireRole.length > 0 && user) {
    const allowed = requireRole.some(r => user.roles?.includes(r));
    if (!allowed) {
      window.location.replace('/unauthorized');
      return;
    }
  }
}

export const checkAuth = () => isAuthenticated();
export const getAuthUser = () => getCurrentUser();

export const hasRole = (role: string): boolean => {
  return getCurrentUser()?.roles?.includes(role) ?? false;
};

export const hasAnyRole = (roles: string[]): boolean => {
  const user = getCurrentUser();
  return user ? roles.some(r => user.roles?.includes(r)) : false;
};

export async function logout(): Promise<void> {
  const { authService } = require('./api/auth-service');
  await authService.logout();
  window.location.replace('/login');
}