/**
 * Token Manager
 * Manages authentication tokens securely using cookies
 * 
 * Best practices:
 * - Uses secure httpOnly-like cookies
 * - Cookies auto-expire after set time
 * - Session cookies (no expiry) for temporary login
 * - Persistent cookies (7 days) for "Remember me"
 */

import { setCookie, getCookie, removeCookie } from '../cookies';
import { logger } from '../logger';

export interface StoredToken {
  token: string;
  expiresAt?: number;
}

class TokenManager {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_KEY = 'api_key';

  /**
   * Store token securely in cookies
   * - Session cookie (no days): cleared when browser closes
   * - Persistent cookie (7 days): saved for "Remember me"
   */
  setToken(token: string | undefined, rememberMe: boolean = false): void {
    if (!token) {
      return;
    }
    
    try {
      // Set cookie with appropriate expiry
      setCookie(this.TOKEN_KEY, token, {
        days: rememberMe ? 7 : undefined, // undefined = session cookie
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      });
    } catch (e) {
      logger.error('Failed to store token', e);
    }
  }

  /**
   * Get stored token from cookies
   */
  getToken(): string | null {
    try {
      return getCookie(this.TOKEN_KEY);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Store user data in cookies
   */
  setUser(user: any, rememberMe: boolean = false): void {
    try {
      setCookie(this.USER_KEY, JSON.stringify(user), {
        days: rememberMe ? 7 : undefined,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      });
    } catch (e) {
      logger.error('Failed to store user data', e);
    }
  }

  /**
   * Get stored user data from cookies
   */
  getUser(): any {
    try {
      const user = getCookie(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    try {
      return Boolean(this.getToken());
    } catch (_e) {
      return false;
    }
  }

  /**
   * Remove all tokens and user data
   */
  clear(): void {
    try {
      removeCookie(this.TOKEN_KEY);
      removeCookie(this.USER_KEY);
      removeCookie(this.API_KEY);
    } catch (e) {
      logger.error('Failed to clear tokens', e);
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    try {
      const user = this.getUser();
      if (!user || !user.expiresAt) return false;
      return Date.now() > user.expiresAt;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Store API key for service-to-service authentication
   */
  setApiKey(apiKey: string | undefined, options: { days?: number } = {}): void {
    if (!apiKey) {
      return;
    }

    try {
      setCookie(this.API_KEY, apiKey, {
        days: options.days ?? 30,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      });
    } catch (e) {
      logger.error('Failed to store API key', e);
    }
  }

  /**
   * Retrieve stored API key
   */
  getApiKey(): string | null {
    try {
      return getCookie(this.API_KEY);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Remove API key only
   */
  clearApiKey(): void {
    try {
      removeCookie(this.API_KEY);
    } catch (e) {
      logger.error('Failed to clear API key', e);
    }
  }
}

export const tokenManager = new TokenManager();
