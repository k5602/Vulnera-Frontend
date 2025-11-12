/**
 * Request caching and deduplication
 * Prevents duplicate concurrent requests
 */

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  ttl: number;
}

export class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  async dedupe<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached if still valid
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.promise;
    }

    // Create new promise and cache it
    const promise = fn().catch(error => {
      // Don't cache errors
      this.cache.delete(key);
      throw error;
    });

    this.cache.set(key, {
      promise,
      timestamp: now,
      ttl
    });

    return promise;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const requestCache = new RequestCache();

