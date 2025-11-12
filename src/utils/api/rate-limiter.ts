/**
 * Simple client-side rate limiter
 * Prevents brute force login attempts
 */

interface Attempt {
  timestamp: number;
}

export class RateLimiter {
  private attempts: Map<string, Attempt[]> = new Map();
  private lockout: Map<string, number> = new Map();

  /**
   * Check if an action is allowed
   * @param key - Unique identifier (e.g., email address)
   * @param maxAttempts - Max attempts before lockout
   * @param windowMs - Time window for attempts in milliseconds
   * @returns true if action is allowed
   */
  isAllowed(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60 * 1000
  ): boolean {
    const now = Date.now();

    // Check if in lockout period
    const lockoutEnd = this.lockout.get(key);
    if (lockoutEnd && now < lockoutEnd) {
      return false;
    }

    // Get attempts within window
    const allAttempts = this.attempts.get(key) || [];
    const recentAttempts = allAttempts.filter(
      (a) => now - a.timestamp < windowMs
    );

    // Check if exceeds max attempts
    if (recentAttempts.length >= maxAttempts) {
      // Lock for 15 minutes
      this.lockout.set(key, now + 15 * 60 * 1000);
      return false;
    }

    // Record this attempt
    recentAttempts.push({ timestamp: now });
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Get remaining lockout time in milliseconds
   * @param key - Unique identifier
   * @returns Milliseconds until lockout ends (0 if not locked)
   */
  getRemainingTime(key: string): number {
    const lockoutEnd = this.lockout.get(key);
    if (!lockoutEnd) return 0;

    const remaining = lockoutEnd - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Clear all attempts for a key (e.g., after successful login)
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.lockout.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.attempts.clear();
    this.lockout.clear();
  }
}

export const loginLimiter = new RateLimiter();

