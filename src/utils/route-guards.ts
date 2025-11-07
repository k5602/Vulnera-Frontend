/**
 * Route Guards - Client-side authentication checks for protected routes
 * Runs immediately on page load before rendering
 */

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Check if user is authenticated
 * Looks for auth token in cookies
 */
export function isTokenValid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = getCookie('auth_token');
  
  if (!token) return false;
  
  return true;
}

/**
 * Protect a route - redirects to login if not authenticated
 * Call this immediately in a page's script before any rendering
 * 
 * @param redirectPath - Where to redirect after login (defaults to current path)
 */
export function requireAuth(redirectPath?: string): void {
  if (typeof window === 'undefined') return;
  
  // Only check on client-side navigation
  if (!isTokenValid()) {
    const nextPath = redirectPath || (window.location.pathname + window.location.search);
    window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
  }
}

/**
 * Protect a route - redirects to home if already authenticated (for login/signup pages)
 */
export function requireGuest(): void {
  if (typeof window === 'undefined') return;
  
  if (isTokenValid()) {
    window.location.href = '/dashboard';
  }
}

/**
 * Get the next redirect path from URL params, defaults to /dashboard
 */
export function getNextPath(): string {
  if (typeof window === 'undefined') return '/dashboard';
  
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  
  // Validate it's a safe path (not external)
  if (next && next.startsWith('/')) {
    return next;
  }
  
  return '/dashboard';
}

/**
 * Inline script string for immediate auth check (embed directly in pages)
 * Use this in <script is:inline> tags for fastest redirect
 */
export const INLINE_AUTH_CHECK = `
  (function() {
    function getCookie(name) {
      const nameEQ = encodeURIComponent(name) + '=';
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(nameEQ)) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
      return null;
    }
    const token = getCookie('auth_token');
    if (!token) {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = '/login?next=' + encodeURIComponent(currentPath);
    }
  })();
`;

/**
 * Inline script string for guest check (for login/signup pages)
 */
export const INLINE_GUEST_CHECK = `
  (function() {
    function getCookie(name) {
      const nameEQ = encodeURIComponent(name) + '=';
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(nameEQ)) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
      return null;
    }
    const token = getCookie('auth_token');
    if (token) {
      window.location.href = '/dashboard';
    }
  })();
`;
