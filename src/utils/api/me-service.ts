/**
 * Me Service (Personal Analytics)
 * Centralized service for personal user analytics dashboard and usage
 */
import { apiClient } from './client';
import { API_ENDPOINTS } from '../../config/api';

/** Extract error message from unknown API error response */
function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return fallback;
}

// ============================================================================
// Type Definitions (from OpenAPI spec)
// ============================================================================

/** Personal scan summary */
export interface PersonalScanSummary {
    id: string;
    source_uri: string;
    source_type: 'file' | 'git' | 'github' | 'url';
    status: 'pending' | 'running' | 'completed' | 'failed';
    created_at: string;
    completed_at?: string;
    findings_count: number;
    critical_count: number;
    high_count: number;
}

/** Personal statistics */
export interface PersonalStats {
    total_scans: number;
    scans_this_month: number;
    total_vulnerabilities_found: number;
    critical_vulnerabilities: number;
    high_vulnerabilities: number;
    medium_vulnerabilities: number;
    low_vulnerabilities: number;
    info_vulnerabilities: number;
    most_common_vulnerability_type?: string;
    average_scan_time_seconds?: number;
}

/** Personal quota information */
export interface PersonalQuota {
    plan: 'free' | 'pro' | 'enterprise';
    scans_limit: number;
    scans_used: number;
    scans_remaining: number;
    api_calls_limit: number;
    api_calls_used: number;
    api_calls_remaining: number;
    llm_queries_limit: number;
    llm_queries_used: number;
    llm_queries_remaining: number;
    reset_at: string;
}

/** Top vulnerability info */
export interface TopVulnerability {
    cve_id?: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    package_name: string;
    occurrence_count: number;
}

/** Personal dashboard response */
export interface PersonalDashboard {
    user: {
        id: string;
        email: string;
        name?: string;
        created_at: string;
    };
    stats: PersonalStats;
    quota: PersonalQuota;
    recent_scans: PersonalScanSummary[];
    top_vulnerabilities: TopVulnerability[];
    organizations: Array<{
        id: string;
        name: string;
        role: 'owner' | 'admin' | 'member';
    }>;
}

/** Usage data point */
export interface UsageDataPoint {
    date: string;
    scans: number;
    api_calls: number;
    llm_queries: number;
    vulnerabilities_found: number;
}

/** Personal usage response */
export interface PersonalUsage {
    period_start: string;
    period_end: string;
    total_scans: number;
    total_api_calls: number;
    total_llm_queries: number;
    total_vulnerabilities: number;
    daily_usage: UsageDataPoint[];
    breakdown_by_source_type: {
        file: number;
        git: number;
        github: number;
        url: number;
    };
    breakdown_by_severity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
}

/** Standard API response */
export interface MeServiceResponse<T = unknown> {
    success: boolean;
    status?: number;
    error?: string;
    data?: T;
}

// ============================================================================
// Me Service Implementation
// ============================================================================

export class MeService {
    /**
     * Get personal dashboard with comprehensive analytics
     * Includes user info, stats, quota, recent scans, and top vulnerabilities
     */
    async getDashboard(): Promise<MeServiceResponse<PersonalDashboard>> {
        try {
            const response = await apiClient.get(API_ENDPOINTS.ME.DASHBOARD);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get personal dashboard'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as PersonalDashboard,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting personal dashboard',
            };
        }
    }

    /**
     * Get personal usage analytics over time
     * @param period - Time period ('7d', '30d', '90d', '365d')
     */
    async getUsage(period: '7d' | '30d' | '90d' | '365d' = '30d'): Promise<MeServiceResponse<PersonalUsage>> {
        try {
            const url = `${API_ENDPOINTS.ME.USAGE}?period=${period}`;
            const response = await apiClient.get(url);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get usage analytics'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as PersonalUsage,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting usage analytics',
            };
        }
    }
}

// Export singleton instance
export const meService = new MeService();
