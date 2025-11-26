/**
 * Auth Service
 * Centralized service for authentication and API key management
 */
import { apiClient } from './client';
import { clearAuth, isAuthenticated, getCurrentUser } from './auth-store';
import { API_ENDPOINTS } from '../../config/api';

export interface ApiKeyResponse {
  success: boolean;
  status?: number;
  error?: string;
  data?: any;
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
  logout(): void {
    clearAuth();
    try {
      localStorage.removeItem('github_token');
      localStorage.removeItem('api_token');
    } catch {
      // Ignore errors
    }
  }

  /**
   * List API keys for current user
   */
  async listApiKeys(): Promise<ApiKeyResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.LIST_API_KEYS);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: response.error?.message || 'Failed to load API keys',
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
   * Create a new API key
   */
  async createApiKey(payload: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.CREATE_API_KEY, payload);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: response.error?.message || 'Failed to create API key',
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
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<ApiKeyResponse> {
    try {
      const endpoint = API_ENDPOINTS.AUTH.REVOKE_API_KEY.replace(':key_id', keyId);
      const response = await apiClient.delete(endpoint);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: response.error?.message || 'Failed to revoke API key',
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
      return response.status !== 404;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
