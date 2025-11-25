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
    startAutoRefresh(): void {
        if (this.intervalId !== null) {
            logger.warn("Token refresh manager already running");
            return;
        }

        logger.info("Starting automatic token refresh manager");

        // Initial refresh
        refreshAuth().catch(err => {
            logger.error("Initial token refresh failed", err);
        });

        // Set up periodic refresh
        this.intervalId = window.setInterval(async () => {
            try {
                logger.debug("Executing scheduled token refresh");
                const success = await refreshAuth();
                if (success) {
                    logger.debug("Scheduled token refresh successful");
                } else {
                    logger.warn("Scheduled token refresh failed (invalid session)");
                    this.stopAutoRefresh(); // Stop if session is invalid
                }
            } catch (error) {
                logger.error("Error during scheduled token refresh", error);
            }
        }, this.REFRESH_INTERVAL);
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
