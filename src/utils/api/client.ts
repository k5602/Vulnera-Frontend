/**
 * API Client
 * Handles all API communication with error handling and token management
 */

import { API_CONFIG } from '../../config/api';
import { tokenManager } from './token-manager';
import { parseApiResponse, ApiResponseSchema } from '../../types/api';
import { requestCache } from './request-cache';
import { logger } from '../logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  /**
   * Make an API request
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Handle empty baseUrl - use absolute URL if endpoint is absolute, otherwise error
    let url: string;
    if (!this.baseUrl) {
      // If baseUrl is empty and endpoint is relative, this is a configuration error
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        logger.error('API base URL is not configured. Please set PUBLIC_API_BASE environment variable.');
        return {
          success: false,
          error: 'API base URL is not configured. Please set PUBLIC_API_BASE environment variable.',
          status: 500,
        };
      }
      url = endpoint;
    } else {
      url = new URL(endpoint, this.baseUrl).toString();
    }
    
    // Add auth token if available
    const headers = new Headers(options.headers || {});

    // Prefer API key when present, otherwise fallback to bearer token
    const apiKey = tokenManager.getApiKey();
    if (apiKey) {
      headers.set('X-API-Key', apiKey);
      headers.set('Authorization', `ApiKey ${apiKey}`);
    } else {
      const token = tokenManager.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Set default headers
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include', // Include httpOnly cookies
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response
        const data = await this.parseResponse(response);

        // Validate response schema
        const validatedData = parseApiResponse(data, ApiResponseSchema);

        if (!response.ok) {
          throw {
            message: validatedData.error || validatedData.message || 'API Error',
            status: response.status,
            details: validatedData,
          };
        }

        return {
          success: true,
          data: validatedData.data || validatedData,
          status: response.status,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Explicitly handle timeout
        if (error instanceof DOMException && error.name === 'AbortError') {
          return {
            success: false,
            error: `Request timeout after ${this.timeout}ms`,
            status: 408,
          };
        }
        throw error;
      }
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  /**
   * Handle API errors
   */
  private handleError<T>(_error: any): ApiResponse<T> {
    const error = _error as ApiError;

    logger.error('API Error:', error);

    return {
      success: false,
      error: error.message || 'An error occurred',
      status: error.status || 500,
    };
  }

  /**
   * GET request with caching
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return requestCache.dedupe(
      `GET:${endpoint}`,
      () => this.request<T>(endpoint, {
        method: 'GET',
      }),
      5 * 60 * 1000 // 5 min cache
    );
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Replace path parameters in endpoint
   */
  replacePath(endpoint: string, params: Record<string, string | number>): string {
    let result = endpoint;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, String(value));
    }
    return result;
  }
}

export const apiClient = new ApiClient();
