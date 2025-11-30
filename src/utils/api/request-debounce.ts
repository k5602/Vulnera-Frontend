/**
 * Request Debounce and Duplicate Prevention Utility
 * 
 * This module provides a centralized mechanism for:
 * 1. Debouncing rapid API requests (prevents duplicate requests)
 * 2. Tracking in-flight requests to avoid duplicates
 * 3. Caching GET requests for quick repeated access
 * 4. Logging all operations for debugging
 * 
 * Usage:
 * ```typescript
 * const debouncer = new RequestDebouncer();
 * 
 * // Debounce a request with 2 second delay
 * const result = await debouncer.debounce(
 *   'user-dashboard',  // unique key
 *   () => apiClient.get('/api/v1/me/analytics/dashboard'),
 *   { delay: 2000 }
 * );
 * 
 * // For GET requests, use cache-first approach
 * const cached = await debouncer.debouncedGet(
 *   '/api/v1/organizations/123/analytics',
 *   { delay: 2000, ttl: 30000 }  // cache for 30 seconds
 * );
 * ```
 */

import { logger } from '../logger';

export interface DebounceOptions {
  /** Delay in milliseconds before executing (default: 2000) */
  delay?: number;
  /** For GET requests: time-to-live for cache in ms (default: 30000) */
  ttl?: number;
  /** Cancel any pending request */
  cancel?: boolean;
}

interface PendingRequest {
  timeoutId: NodeJS.Timeout;
  key: string;
  timestamp: number;
}

interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Centralized request debouncer with duplicate prevention and caching
 */
export class RequestDebouncer {
  private pending = new Map<string, PendingRequest>();
  private inFlight = new Set<string>();
  private cache = new Map<string, CachedResponse>();

  /**
   * Debounce any async function with duplicate prevention
   * @param key Unique identifier for this request group
   * @param fn Async function to debounce
   * @param options Debounce configuration
   * @returns Promise resolving to function result or null if duplicate/cancelled
   */
  async debounce<T>(
    key: string,
    fn: () => Promise<T>,
    options: DebounceOptions = {}
  ): Promise<T | null> {
    const delay = options.delay ?? 2000;

    // If same request already pending, skip
    if (this.pending.has(key)) {
      logger.debug('Duplicate request detected, skipping', { key });
      return null;
    }

    // If same request in-flight, skip
    if (this.inFlight.has(key)) {
      logger.debug('Request already in-flight, skipping', { key });
      return null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        try {
          this.pending.delete(key);
          this.inFlight.add(key);
          logger.debug('Executing debounced request', { key, delay });

          const result = await fn();
          resolve(result);
        } catch (error) {
          logger.error('Debounced request failed', { key, error });
          resolve(null as any);
        } finally {
          this.inFlight.delete(key);
        }
      }, delay);

      this.pending.set(key, {
        timeoutId,
        key,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Debounce GET requests with optional caching
   * Uses cache-first approach for frequently accessed endpoints
   * @param endpoint URL to fetch
   * @param options Debounce and cache configuration
   * @returns Cached or fresh response
   */
  async debouncedGet<T>(
    endpoint: string,
    options: DebounceOptions = {}
  ): Promise<T | null> {
    // Check cache first
    const cached = this.getCachedResponse<T>(endpoint);
    if (cached) {
      logger.debug('Using cached GET response', { endpoint });
      return cached;
    }

    // If cache miss, debounce the request
    return this.debounce(
      `GET-${endpoint}`,
      async () => {
        // This is a placeholder - actual apiClient.get would be called from the service
        return null as any;
      },
      options
    );
  }

  /**
   * Cache a GET response
   */
  cacheResponse<T>(endpoint: string, data: T, ttl?: number): void {
    const cacheTime = ttl ?? 30000;
    this.cache.set(endpoint, {
      data,
      timestamp: Date.now(),
      ttl: cacheTime,
    });
    logger.debug('Cached GET response', { endpoint, ttl: cacheTime });
  }

  /**
   * Get cached response if still valid
   */
  private getCachedResponse<T>(endpoint: string): T | null {
    const cached = this.cache.get(endpoint);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(endpoint);
      logger.debug('Cache expired', { endpoint, age });
      return null;
    }

    return cached.data as T;
  }

  /**
   * Clear cache for specific endpoint or all
   */
  clearCache(endpoint?: string): void {
    if (endpoint) {
      this.cache.delete(endpoint);
      logger.debug('Cleared cache for endpoint', { endpoint });
    } else {
      this.cache.clear();
      logger.debug('Cleared all cache');
    }
  }

  /**
   * Cancel pending request by key
   */
  cancelPending(key: string): void {
    const pending = this.pending.get(key);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pending.delete(key);
      logger.debug('Cancelled pending request', { key });
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.pending.forEach((req) => clearTimeout(req.timeoutId));
    this.pending.clear();
    logger.debug('Cancelled all pending requests');
  }

  /**
   * Get debouncer statistics
   */
  getStats() {
    return {
      pendingRequests: this.pending.size,
      inFlightRequests: this.inFlight.size,
      cacheSize: this.cache.size,
      pendingKeys: Array.from(this.pending.keys()),
      inFlightKeys: Array.from(this.inFlight),
      cachedEndpoints: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const requestDebouncer = new RequestDebouncer();
