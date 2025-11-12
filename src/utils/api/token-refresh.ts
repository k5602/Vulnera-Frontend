import { authService } from './auth-service';
import { tokenManager } from './token-manager';

const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 min before expiry

export class TokenRefreshManager {
  private refreshTimer: number | null = null;

  startAutoRefresh(): void {
    if (typeof window === 'undefined') return;

    // Check every minute if refresh needed
    this.refreshTimer = window.setInterval(() => {
      this.checkAndRefresh();
    }, 60 * 1000);

    // Also check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndRefresh();
      }
    });
  }

  private async checkAndRefresh(): Promise<void> {
    const user = tokenManager.getUser();
    if (!user?.expiresAt) return;

    const timeUntilExpiry = user.expiresAt - Date.now();

    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      try {
        await authService.refreshToken();
      } catch (error) {
        // Refresh failed, user needs to login again
        authService.clearAuth();
        window.location.href = '/login';
      }
    }
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const tokenRefreshManager = new TokenRefreshManager();

