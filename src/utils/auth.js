/**
 * Simple Demo Authentication System
 * Client-side auth for demo purposes
 */

// Demo credentials
export const DEMO_EMAIL = 'demo@vulnera.com';
export const DEMO_PASSWORD = 'demo123';

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return !!token;
}

/**
 * Get current user email
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const email = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
  return email;
}

/**
 * Login with demo credentials
 */
export function login(email, password, remember = false) {
  console.log('[Auth] Login called with:', { email, password, remember });
  console.log('[Auth] Expected:', { email: DEMO_EMAIL, password: DEMO_PASSWORD });
  console.log('[Auth] Match:', email === DEMO_EMAIL, password === DEMO_PASSWORD);
  
  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const storage = remember ? localStorage : sessionStorage;
    const token = 'demo_' + Date.now();
    console.log('[Auth] Storing token:', token, 'in', remember ? 'localStorage' : 'sessionStorage');
    storage.setItem('auth_token', token);
    storage.setItem('user_email', email);
    console.log('[Auth] Token stored, checking:', storage.getItem('auth_token'));
    return true;
  }
  console.log('[Auth] Login failed - credentials do not match');
  return false;
}

/**
 * Logout user
 */
export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user_email');
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth(currentPath) {
  if (typeof window === 'undefined') return;
  if (!isAuthenticated()) {
    window.location.href = '/login?next=' + encodeURIComponent(currentPath);
  }
}
