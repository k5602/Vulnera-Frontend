/**
 * Centralized authentication guard logic
 * Use this in all pages instead of inline scripts
 */

import { getCookie } from './cookies';

export interface AuthGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Get authentication token from cookies
 */
function getAuthToken(): string | null {
  return getCookie('auth_token');
}

/**
 * Get redirect destination from URL params
 */
function getRedirectPath(defaultPath: string): string {
  if (typeof window === 'undefined') return defaultPath;

  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  // Validate it's a safe relative path
  if (next && next.startsWith('/') && !next.includes('//')) {
    return next;
  }

  return defaultPath;
}

/**
 * Setup authentication guard for a page
 * Call this in a module script on pages that need auth
 */
export function setupAuthGuard(options: AuthGuardOptions = {}): void {
  if (typeof window === 'undefined') return;

  const hasAuth = !!getAuthToken();
  const { requireAuth = false, redirectTo = '/dashboard' } = options;

  if (requireAuth && !hasAuth) {
    // Protected page - user not authenticated
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`;
    window.location.href = loginUrl;
  } else if (!requireAuth && hasAuth) {
    // Guest page - user already authenticated
    window.location.href = redirectTo;
  }
}

/**
 * String to embed directly in Astro pages as inline script
 * Usage: <script is:inline define:vars={{requireAuth: true}}>
 *        {INLINE_GUARD_SCRIPT}
 *        </script>
 */
export const INLINE_GUARD_SCRIPT = `
  (function() {
    function getToken() {
      const nameEQ = 'auth_token=';
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(nameEQ)) {
          return decodeURIComponent(trimmed.substring(nameEQ.length));
        }
      }
      return null;
    }

    const hasAuth = !!getToken();

    if (requireAuth && !hasAuth) {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = '/login?next=' + encodeURIComponent(currentPath);
    } else if (!requireAuth && hasAuth) {
      window.location.href = '/dashboard';
    }
  })();
`;

