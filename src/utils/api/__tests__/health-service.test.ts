/**
 * Health Service Tests
 * Tests for system health monitoring and metrics
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { healthService } from '../health-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

// Helper to create mock fetch response
const createMockResponse = (ok: boolean, status: number, data: unknown = {}) => ({
    ok,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(data)),
});

describe('Health Service', () => {
    beforeEach(() => {
        localStorage.clear();
        __resetStorageInitFlag();
        vi.clearAllMocks();
        vi.useFakeTimers();
        setCsrfToken('test-csrf-token');
    });

    afterEach(() => {
        localStorage.clear();
        __resetStorageInitFlag();
        clearAuth();
        vi.useRealTimers();
    });

    // =========================================================================
    // Check Health
    // =========================================================================
    describe('checkHealth', () => {
        it('should return health status on success', async () => {
            const healthData = {
                status: 'healthy',
                timestamp: '2024-01-01T00:00:00Z',
                version: '1.0.0',
                uptime: 86400,
                details: {
                    database: 'healthy',
                    cache: 'healthy',
                },
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, healthData));

            const result = await healthService.checkHealth();

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('healthy');
            expect(result.data?.version).toBe('1.0.0');
        });

        it('should fallback to alternate endpoint on 404', async () => {
            global.fetch = vi.fn()
                .mockResolvedValueOnce(createMockResponse(false, 404, {}))
                .mockResolvedValueOnce(createMockResponse(true, 200, { status: 'healthy' }));

            const result = await healthService.checkHealth();

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('healthy');
        });

        it('should return error for server failure', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Internal error' })
            );

            const result = await healthService.checkHealth();

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should return degraded status', async () => {
            const healthData = {
                status: 'degraded',
                timestamp: '2024-01-01T00:00:00Z',
                message: 'Database connection slow',
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, healthData));

            const result = await healthService.checkHealth();

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('degraded');
        });

        it('should return unhealthy status', async () => {
            const healthData = {
                status: 'unhealthy',
                timestamp: '2024-01-01T00:00:00Z',
                message: 'Database offline',
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, healthData));

            const result = await healthService.checkHealth();

            expect(result.ok).toBe(true);
            expect(result.data?.status).toBe('unhealthy');
        });
    });

    // =========================================================================
    // Get Metrics
    // =========================================================================
    describe('getMetrics', () => {
        it('should return system metrics', async () => {
            const metricsData = {
                timestamp: '2024-01-01T00:00:00Z',
                uptime_seconds: 86400,
                requests_total: 10000,
                requests_success: 9500,
                requests_error: 500,
                response_time_ms: {
                    min: 5,
                    max: 500,
                    avg: 50,
                },
                cache_hits: 8000,
                cache_misses: 2000,
                cache_hit_rate: 0.8,
                active_connections: 25,
                memory_usage: {
                    rss_mb: 256,
                    heap_used_mb: 128,
                    heap_total_mb: 512,
                },
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, metricsData));

            const result = await healthService.getMetrics();

            expect(result.ok).toBe(true);
            expect(result.data?.uptime_seconds).toBe(86400);
            expect(result.data?.cache_hit_rate).toBe(0.8);
            expect(result.data?.response_time_ms.avg).toBe(50);
        });

        it('should handle unauthorized (401)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 401, { message: 'Unauthorized' })
            );

            const result = await healthService.getMetrics();

            expect(result.ok).toBe(false);
            expect(result.status).toBe(401);
        });
    });

    // =========================================================================
    // Is Healthy Check
    // =========================================================================
    describe('isHealthy', () => {
        it('should return true when system is healthy', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'healthy' })
            );

            const result = await healthService.isHealthy();

            expect(result).toBe(true);
        });

        it('should return false when system is unhealthy', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'unhealthy' })
            );

            const result = await healthService.isHealthy();

            expect(result).toBe(false);
        });

        it('should return false when system is degraded', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'degraded' })
            );

            const result = await healthService.isHealthy();

            expect(result).toBe(false);
        });

        it('should retry on failure up to max retries', async () => {
            global.fetch = vi.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(createMockResponse(true, 200, { status: 'healthy' }));

            const resultPromise = healthService.isHealthy(3);

            // Advance timers for retry delays
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);

            const result = await resultPromise;

            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(result).toBe(true);
        });

        it('should return false after all retries fail', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const resultPromise = healthService.isHealthy(2);

            // Advance timers for retry delays
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);

            const result = await resultPromise;

            expect(result).toBe(false);
        });

        it('should use default max retries of 3', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const resultPromise = healthService.isHealthy();

            // Advance timers for retry delays
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);
            await vi.advanceTimersByTimeAsync(3000);

            await resultPromise;

            expect(global.fetch).toHaveBeenCalledTimes(3);
        });
    });

    // =========================================================================
    // Health Monitoring
    // =========================================================================
    describe('startHealthMonitoring', () => {
        it('should start polling and return cleanup function', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'healthy' })
            );

            const cleanup = healthService.startHealthMonitoring(5000);

            expect(typeof cleanup).toBe('function');

            // Cleanup
            cleanup();
        });

        it('should call callback on status change', async () => {
            global.fetch = vi.fn()
                .mockResolvedValueOnce(createMockResponse(true, 200, { status: 'healthy' }))
                .mockResolvedValueOnce(createMockResponse(true, 200, { status: 'degraded' }));

            const onStatusChange = vi.fn();
            const cleanup = healthService.startHealthMonitoring(1000, onStatusChange);

            // First check (initial status)
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            // Second check (status changed)
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'degraded' }));

            cleanup();
        });

        it('should not call callback when status remains the same', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'healthy' })
            );

            const onStatusChange = vi.fn();
            const cleanup = healthService.startHealthMonitoring(1000, onStatusChange);

            // First check
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            // Second check (same status)
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            // Third check (same status)
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            // Should be called once on first detection, then again only if changed
            // Based on implementation, it calls on first change from null
            expect(onStatusChange).toHaveBeenCalledTimes(1);

            cleanup();
        });

        it('should use default interval of 30000ms', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'healthy' })
            );

            const cleanup = healthService.startHealthMonitoring();

            // Should not have been called yet
            expect(global.fetch).not.toHaveBeenCalled();

            // Advance by default interval
            await vi.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(global.fetch).toHaveBeenCalledTimes(1);

            cleanup();
        });

        it('should stop polling after cleanup is called', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { status: 'healthy' })
            );

            const cleanup = healthService.startHealthMonitoring(1000);

            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            const callsBeforeCleanup = (global.fetch as any).mock.calls.length;
            cleanup();

            await vi.advanceTimersByTimeAsync(5000);
            await Promise.resolve();

            expect((global.fetch as any).mock.calls.length).toBe(callsBeforeCleanup);
        });

        it('should handle fetch errors gracefully', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const onStatusChange = vi.fn();
            const cleanup = healthService.startHealthMonitoring(1000, onStatusChange);

            // Should not throw
            await vi.advanceTimersByTimeAsync(1000);
            await Promise.resolve();

            // Status change should not be called on error
            expect(onStatusChange).not.toHaveBeenCalled();

            cleanup();
        });
    });
});
