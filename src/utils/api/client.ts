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
            // Only include credentials if backend supports it (not with wildcard CORS)
            // credentials: 'include', // Commented out - backend uses wildcard CORS
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Parse response
          const data = await this.parseResponse(response);

          // Handle error responses
          if (!response.ok) {
            // Try to extract error message from response
            let errorMessage = 'API Error';
            if (data && typeof data === 'object') {
              errorMessage = (data as any).error || (data as any).message || (data as any).detail || JSON.stringify(data);
            } else if (typeof data === 'string') {
              errorMessage = data;
            }
            
            throw {
              message: errorMessage,
              status: response.status,
              details: data,
            };
          }

          // For successful responses, try to validate but be flexible
          let responseData: any = data;
          try {
            // Try to validate against schema, but don't fail if it doesn't match
            const validatedData = parseApiResponse(data, ApiResponseSchema);
            // If validation succeeds and has a data field, use it
            if (validatedData && typeof validatedData === 'object' && 'data' in validatedData) {
              responseData = validatedData.data || validatedData;
            } else {
              responseData = validatedData;
            }
          } catch (validationError) {
            // If validation fails, just use the raw data
            // This handles cases where backend returns data directly (e.g., token response)
            console.debug('[API] Response validation failed, using raw data:', validationError);
            responseData = data;
          }

        return {
          success: true,
          data: responseData as T,
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
        // Handle network errors (CORS, connection refused, etc.)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          const errorMsg = `Cannot connect to API server at ${this.baseUrl || 'configured URL'}. This is likely a CORS issue. Please ensure:\n1. Backend is running and accessible\n2. CORS is configured to allow origin: ${typeof window !== 'undefined' ? window.location.origin : 'frontend origin'}\n3. Backend allows credentials if using cookies`;
          
          console.error('[Network Error]', {
            message: errorMsg,
            url,
            baseUrl: this.baseUrl,
            endpoint,
            frontendOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
          });
          
          return {
            success: false,
            error: errorMsg,
            status: 0,
          };
        }
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
    // Extract error information more thoroughly
    let errorMessage = 'An error occurred';
    let status = 500;
    
    if (_error) {
      // Handle different error types
      if (typeof _error === 'string') {
        errorMessage = _error;
      } else if (_error instanceof Error) {
        errorMessage = _error.message;
        // Check for network errors
        if (_error.message === 'Failed to fetch') {
          errorMessage = `Cannot connect to API server at ${this.baseUrl || 'configured URL'}. Check CORS configuration and network connectivity.`;
          status = 0;
        }
      } else if (typeof _error === 'object') {
        errorMessage = _error.message || _error.error || JSON.stringify(_error);
        status = _error.status || status;
      }
    }

    // Always log errors with full context 
    console.error('[API Error]', {
      message: errorMessage,
      status,
      baseUrl: this.baseUrl,
      error: _error,
    });

    return {
      success: false,
      error: errorMessage,
      status,
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
