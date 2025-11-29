/**
 * Auth Service
 * Centralized service for authentication and API key management
 */
import { apiClient } from './client';
import { clearAuth, isAuthenticated, getCurrentUser } from './auth-store';
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

export class AuthService {
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
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      logger.warn('Logout endpoint failed, proceeding with local cleanup', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      // Always clear local state
      clearAuth();
      try {
        localStorage.removeItem('github_token');
        localStorage.removeItem('api_token');
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * List API keys for current user with rate limit retry logic
   * @param forceRefresh - Add cache-bust parameter to force fresh API call
   */
  async listApiKeys(forceRefresh = false): Promise<ApiKeyResponse> {
    try {
      let endpoint = API_ENDPOINTS.AUTH.LIST_API_KEYS;

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