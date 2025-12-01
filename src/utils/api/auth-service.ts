/**
 * Auth Service
 * Centralized service for authentication, registration, and API key management
 */
import { apiClient } from './client';
import { clearAuth, isAuthenticated, getCurrentUser, setCsrfToken, getCsrfToken, setCurrentUser, type CurrentUser } from './auth-store';
import { API_ENDPOINTS } from '../../config/api';
import { logger } from '../logger';

/** Extract error message from unknown API error response */
function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

// ============================================================================
// Type Definitions
// ============================================================================

/** Login request payload */
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

/** Login response from backend */
export interface LoginResponse {
  user: CurrentUser;
  csrf_token?: string;
  message?: string;
}

/** Registration request payload */
export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization_id?: string;
}

/** Registration response from backend */
export interface RegisterResponse {
  user: CurrentUser;
  csrf_token?: string;
  message?: string;
}

/** Token refresh response */
export interface RefreshResponse {
  csrf_token?: string;
  message?: string;
}

/** Standard auth service response */
export interface AuthServiceResponse<T = unknown> {
  success: boolean;
  status?: number;
  error?: string;
  data?: T;
}

/** API key response (legacy interface) */
export interface ApiKeyResponse {
  success: boolean;
  status?: number;
  error?: string;
  data?: unknown;
}

export interface CreateApiKeyRequest {
  name: string;
  expires_at?: string;
}

// ============================================================================
// Auth Service Implementation
// ============================================================================

export class AuthService {
  // --------------------------------------------------------------------------
  // Authentication Methods
  // --------------------------------------------------------------------------

  /**
   * Login user with email and password
   * Sets CSRF token and user data on success
   */
  async login(payload: LoginRequest): Promise<AuthServiceResponse<LoginResponse>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, payload);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          return {
            success: false,
            status: response.status,
            error: 'Invalid email or password',
          };
        }

        if (response.status === 429) {
          const errorData = response.error as { details?: { retry_after?: number } } | undefined;
          const retryAfter = errorData?.details?.retry_after || 5;
          return {
            success: false,
            status: response.status,
            error: `Too many login attempts. Please retry after ${retryAfter} seconds.`,
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Login failed'),
        };
      }

      const data = response.data as LoginResponse;

      // Store auth data (CSRF token is auto-extracted in apiClient)
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      if (data.user) {
        setCurrentUser(data.user);
      }

      return {
        success: true,
        status: response.status,
        data,
      };
    } catch {
      return {
        success: false,
        error: 'Network error during login',
      };
    }
  }

  /**
   * Register a new user account
   */
  async register(payload: RegisterRequest): Promise<AuthServiceResponse<RegisterResponse>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, payload);

      if (!response.ok) {
        // Handle email already exists
        if (response.status === 409) {
          return {
            success: false,
            status: response.status,
            error: 'An account with this email already exists',
          };
        }

        // Handle validation errors
        if (response.status === 400) {
          return {
            success: false,
            status: response.status,
            error: extractApiErrorMessage(response.error, 'Invalid registration data'),
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Registration failed'),
        };
      }

      const data = response.data as RegisterResponse;

      // Store auth data
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      if (data.user) {
        setCurrentUser(data.user);
      }

      return {
        success: true,
        status: response.status,
        data,
      };
    } catch {
      return {
        success: false,
        error: 'Network error during registration',
      };
    }
  }

  /**
   * Refresh authentication token
   * Called automatically by apiClient on 401, but can be called manually
   */
  async refresh(): Promise<AuthServiceResponse<RefreshResponse>> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);

      if (!response.ok) {
        // If refresh fails, clear auth state
        if (response.status === 401) {
          clearAuth();
          return {
            success: false,
            status: response.status,
            error: 'Session expired. Please login again.',
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Failed to refresh session'),
        };
      }

      const data = response.data as RefreshResponse;

      // Update CSRF token if provided
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }

      return {
        success: true,
        status: response.status,
        data,
      };
    } catch {
      return {
        success: false,
        error: 'Network error during token refresh',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return isAuthenticated();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return getCurrentUser();
  }

  /**
   * Get stored API token (if any)
   */
  getToken(): string | null {
    try {
      return localStorage.getItem('github_token') || localStorage.getItem('api_token');
    } catch {
      return null;
    }
  }

  /**
   * Logout user
   */
  /**
   * Logout user
   * Fire-and-forget: clears local state immediately, then notifies backend
   */
  async logout(): Promise<void> {
    // 1. Capture token before clearing state
    const csrfToken = getCsrfToken();

    // 2. Always clear local state immediately for instant UI feedback
    clearAuth();
    try {
      localStorage.removeItem('github_token');
      localStorage.removeItem('api_token');
    } catch {
      // Ignore errors
    }

    // 3. Notify backend in background (fire-and-forget)
    // We don't await this because we want the UI to be responsive immediately
    if (csrfToken) {
      apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, undefined, {
        keepalive: true, // Ensure request survives page unload/redirect
        headers: {
          'X-CSRF-Token': csrfToken
        }
      }).catch(err => {
        // Suppress errors for background logout
        logger.warn('Background logout request failed', { error: err });
      });
    }
  }

  /**
   * List API keys for current user with rate limit retry logic
   * @param forceRefresh - Add cache-bust parameter to force fresh API call
   */
  async listApiKeys(forceRefresh = false): Promise<ApiKeyResponse> {
    try {
      let endpoint: string = API_ENDPOINTS.AUTH.LIST_API_KEYS;

      // Add cache-bust parameter if forced refresh is needed
      if (forceRefresh) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint = `${endpoint}${separator}_t=${Date.now()}`;
      }

      const response = await apiClient.get(endpoint);

      if (!response.ok) {
        // Handle rate limiting (429) with retry information
        if (response.status === 429) {
          const errorData = response.error as { details?: { retry_after?: number } } | undefined;
          const retryAfter = errorData?.details?.retry_after || 5;
          return {
            success: false,
            status: response.status,
            error: `Rate limited. Please retry after ${retryAfter} seconds.`,
            data: response.error,
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Failed to load API keys'),
          data: response.error,
        };
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error while loading API keys',
      };
    }
  }

  /**
   * Create a new API key with rate limit handling
   */
  async createApiKey(payload: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.CREATE_API_KEY, payload);

      if (!response.ok) {
        // Handle rate limiting (429) with retry information
        if (response.status === 429) {
          const errorData = response.error as { details?: { retry_after?: number } } | undefined;
          const retryAfter = errorData?.details?.retry_after || 5;
          return {
            success: false,
            status: response.status,
            error: `Rate limited. Please retry after ${retryAfter} seconds.`,
            data: response.error,
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Failed to create API key'),
          data: response.error,
        };
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error while creating API key',
      };
    }
  }

  /**
   * Revoke an API key with rate limit handling
   */
  async revokeApiKey(keyId: string): Promise<ApiKeyResponse> {
    try {
      const endpoint = API_ENDPOINTS.AUTH.REVOKE_API_KEY.replace(':key_id', keyId);
      const response = await apiClient.delete(endpoint);

      if (!response.ok) {
        // Handle rate limiting (429) with retry information
        if (response.status === 429) {
          const errorData = response.error as { details?: { retry_after?: number } } | undefined;
          const retryAfter = errorData?.details?.retry_after || 5;
          return {
            success: false,
            status: response.status,
            error: `Rate limited. Please retry after ${retryAfter} seconds.`,
            data: response.error,
          };
        }

        return {
          success: false,
          status: response.status,
          error: extractApiErrorMessage(response.error, 'Failed to revoke API key'),
          data: response.error,
        };
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error while revoking API key',
      };
    }
  }

  /**
   * Check if API key endpoints are available
   */
  async checkApiKeyEndpoint(): Promise<boolean> {
    try {
      const response = await this.listApiKeys();
      // If status is 0 (network error) or undefined, assume endpoint doesn't exist
      if (!response.status) {
        return false;
      }
      return response.status !== 404;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();