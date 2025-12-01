/**
 * Token Refresh Manager
 * Automatically refreshes authentication tokens at regular intervals
 */
import { refreshAuth } from "./auth-store";
import { logger } from "../logger";

class TokenRefreshManager {
    private intervalId: number | null = null;
    private readonly REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

    /**
     * Start automatic token refresh
     */
    private readonly MIN_REFRESH_DELAY = 5 * 60 * 1000; // 5 minutes minimum between refreshes
    private readonly STORAGE_KEY = 'last_token_refresh';

    startAutoRefresh(): void {
        if (this.intervalId !== null) {
            return;
        }

        logger.info("Starting automatic token refresh manager");

        // Check if we need an initial refresh
        this.checkAndRefresh();

        // Set up periodic refresh
        this.intervalId = window.setInterval(() => {
            this.checkAndRefresh();
        }, this.REFRESH_INTERVAL);
    }

    public async ensureFresh(): Promise<void> {
        await this.checkAndRefresh();
    }

    private async checkAndRefresh(): Promise<void> {
        const lastRefresh = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);
        const now = Date.now();

        // Skip if refreshed recently
        if (now - lastRefresh < this.MIN_REFRESH_DELAY) {
            logger.debug("Skipping token refresh - refreshed recently");
            return;
        }

        // Optimistically update timestamp to prevent race conditions (other tabs/calls)
        localStorage.setItem(this.STORAGE_KEY, Date.now().toString());

        try {
            logger.debug("Executing token refresh");
            const success = await refreshAuth();

            if (success) {
                logger.debug("Token refresh successful");
            } else {
                logger.warn("Token refresh failed or skipped (may be rate limited or server error)");

                // Check if session is still valid (refreshAuth clears it on 401/403)
                // We need to import isAuthenticated to check this
                const { isAuthenticated } = await import("./auth-store");

                if (!isAuthenticated()) {
                    logger.warn("Session expired during background refresh, redirecting to login");

                    // Check if we are on a public page to avoid unnecessary redirects
                    const currentPath = window.location.pathname;
                    const publicPaths = ["/login", "/signup", "/pricing", "/vulnera-ai", "/"];
                    const isPublic = publicPaths.some(path =>
                        path === "/" ? currentPath === "/" : currentPath.startsWith(path)
                    );

                    if (!isPublic) {
                        window.location.replace("/login");
                    }
                }

                // Rate limit protection strategy:
                // - MIN_REFRESH_DELAY (5 min) prevents retry spamming on 429 responses
                // - Failed attempts don't update timestamp, so retries naturally backoff
                // - The interval check ensures max one attempt per MIN_REFRESH_DELAY window
            }
        } catch (error) {
            logger.error("Error during token refresh", error);
        }
    }

    /**
     * Stop automatic token refresh
     */
    stopAutoRefresh(): void {
        if (this.intervalId !== null) {
            logger.info("Stopping automatic token refresh manager");
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export const tokenRefreshManager = new TokenRefreshManager();