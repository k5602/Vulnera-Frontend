/**
 * Health Service
 * Handles system health monitoring and metrics endpoints
 */

import { API_ENDPOINTS } from '../../config/api';
import { apiClient, type ApiResponse } from './client';

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  message?: string;
  details?: {
    database?: string;
    cache?: string;
    apiClients?: string;
  };
}

export interface MetricsResponse {
  timestamp: string;
  uptime_seconds: number;
  requests_total: number;
  requests_success: number;
  requests_error: number;
  response_time_ms: {
    min: number;
    max: number;
    avg: number;
  };
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  active_connections: number;
  memory_usage: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
  database?: {
    pool_connections: number;
    active_queries: number;
  };
}

class HealthService {
  /**
   * Check system health status
   * GET /health
   */
  async checkHealth(): Promise<ApiResponse<HealthCheckResponse>> {
    return apiClient.get<HealthCheckResponse>(API_ENDPOINTS.HEALTH.CHECK);
  }

  /**
   * Get Prometheus-style metrics
   * GET /metrics
   */
  async getMetrics(): Promise<ApiResponse<MetricsResponse>> {
    return apiClient.get<MetricsResponse>(API_ENDPOINTS.HEALTH.METRICS);
  }

  /**
   * Check if system is healthy with retry logic
   */
  async isHealthy(maxRetries: number = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.checkHealth();
        if (response.success && response.data?.status === 'healthy') {
          return true;
        }
      } catch (error) {
        if (i < maxRetries - 1) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    return false;
  }

  /**
   * Monitor health status with polling
   */
  startHealthMonitoring(
    intervalMs: number = 30000,
    onStatusChange?: (status: HealthCheckResponse) => void
  ): () => void {
    let lastStatus: HealthCheckResponse | null = null;

    const intervalId = setInterval(async () => {
      try {
        const response = await this.checkHealth();
        if (response.success && response.data) {
          if (lastStatus?.status !== response.data.status) {
            lastStatus = response.data;
            onStatusChange?.(response.data);
          }
          lastStatus = response.data;
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

export const healthService = new HealthService();
