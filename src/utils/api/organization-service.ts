/**
 * Organization Service
 * Centralized service for organization management, members, and analytics
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

/** Organization member role */
export type OrganizationRole = 'owner' | 'admin' | 'member';

/** Organization model */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    updated_at: string;
    owner_id: string;
    member_count?: number;
}

/** Organization member model */
export interface OrganizationMember {
    user_id: string;
    email: string;
    name?: string;
    role: OrganizationRole;
    joined_at: string;
}

/** Organization stats */
export interface OrganizationStats {
    total_scans: number;
    total_vulnerabilities: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    last_scan_at?: string;
}

/** Organization quota information */
export interface OrganizationQuota {
    plan: string;
    scans_limit: number;
    scans_used: number;
    scans_remaining: number;
    api_calls_limit: number;
    api_calls_used: number;
    api_calls_remaining: number;
    reset_at: string;
}

/** Organization usage data point */
export interface UsageDataPoint {
    date: string;
    scans: number;
    api_calls: number;
    vulnerabilities_found: number;
}

/** Organization usage response */
export interface OrganizationUsage {
    period_start: string;
    period_end: string;
    total_scans: number;
    total_api_calls: number;
    total_vulnerabilities: number;
    daily_usage: UsageDataPoint[];
}

/** Organization dashboard analytics */
export interface OrganizationDashboard {
    organization: Organization;
    stats: OrganizationStats;
    quota: OrganizationQuota;
    recent_scans: Array<{
        id: string;
        source_uri: string;
        status: string;
        created_at: string;
        findings_count: number;
    }>;
    top_vulnerabilities: Array<{
        cve_id?: string;
        title: string;
        severity: string;
        occurrence_count: number;
    }>;
}

/** Create organization request */
export interface CreateOrganizationRequest {
    name: string;
    slug?: string;
    description?: string;
}

/** Update organization request */
export interface UpdateOrganizationRequest {
    name?: string;
    description?: string;
}

/** Invite member request */
export interface InviteMemberRequest {
    email: string;
    role?: OrganizationRole;
}

/** Transfer ownership request */
export interface TransferOwnershipRequest {
    new_owner_id: string;
}

/** Standard API response */
export interface OrganizationServiceResponse<T = unknown> {
    success: boolean;
    status?: number;
    error?: string;
    data?: T;
}

// ============================================================================
// Organization Service Implementation
// ============================================================================

export class OrganizationService {
    // --------------------------------------------------------------------------
    // Organization CRUD Operations
    // --------------------------------------------------------------------------

    /**
     * List all organizations the current user belongs to
     */
    async list(): Promise<OrganizationServiceResponse<Organization[]>> {
        try {
            const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS.LIST);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to list organizations'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as Organization[],
            };
        } catch {
            return {
                success: false,
                error: 'Network error while listing organizations',
            };
        }
    }

    /**
     * Create a new organization
     */
    async create(payload: CreateOrganizationRequest): Promise<OrganizationServiceResponse<Organization>> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.ORGANIZATIONS.CREATE, payload);

            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = response.error as { details?: { retry_after?: number } } | undefined;
                    const retryAfter = errorData?.details?.retry_after || 5;
                    return {
                        success: false,
                        status: response.status,
                        error: `Rate limited. Please retry after ${retryAfter} seconds.`,
                    };
                }

                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to create organization'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as Organization,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while creating organization',
            };
        }
    }

    /**
     * Get a specific organization by ID
     */
    async get(orgId: string): Promise<OrganizationServiceResponse<Organization>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.GET.replace(':id', orgId);
            const response = await apiClient.get(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get organization'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as Organization,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting organization',
            };
        }
    }

    /**
     * Update an organization
     */
    async update(orgId: string, payload: UpdateOrganizationRequest): Promise<OrganizationServiceResponse<Organization>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.UPDATE.replace(':id', orgId);
            const response = await apiClient.put(endpoint, payload);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to update organization'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as Organization,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while updating organization',
            };
        }
    }

    /**
     * Delete an organization (owner only)
     */
    async delete(orgId: string): Promise<OrganizationServiceResponse<void>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.DELETE.replace(':id', orgId);
            const response = await apiClient.delete(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to delete organization'),
                };
            }

            return {
                success: true,
                status: response.status,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while deleting organization',
            };
        }
    }

    /**
     * Leave an organization
     */
    async leave(orgId: string): Promise<OrganizationServiceResponse<void>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.LEAVE.replace(':id', orgId);
            const response = await apiClient.post(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to leave organization'),
                };
            }

            return {
                success: true,
                status: response.status,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while leaving organization',
            };
        }
    }

    /**
     * Transfer organization ownership to another member
     */
    async transferOwnership(orgId: string, payload: TransferOwnershipRequest): Promise<OrganizationServiceResponse<Organization>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.TRANSFER.replace(':id', orgId);
            const response = await apiClient.post(endpoint, payload);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to transfer ownership'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as Organization,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while transferring ownership',
            };
        }
    }

    /**
     * Get organization statistics
     */
    async getStats(orgId: string): Promise<OrganizationServiceResponse<OrganizationStats>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.STATS.replace(':id', orgId);
            const response = await apiClient.get(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get organization stats'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationStats,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting organization stats',
            };
        }
    }

    // --------------------------------------------------------------------------
    // Member Management Operations
    // --------------------------------------------------------------------------

    /**
     * List all members of an organization
     */
    async listMembers(orgId: string): Promise<OrganizationServiceResponse<OrganizationMember[]>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.LIST_MEMBERS.replace(':id', orgId);
            const response = await apiClient.get(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to list members'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationMember[],
            };
        } catch {
            return {
                success: false,
                error: 'Network error while listing members',
            };
        }
    }

    /**
     * Invite a new member to an organization
     */
    async inviteMember(orgId: string, payload: InviteMemberRequest): Promise<OrganizationServiceResponse<OrganizationMember>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.INVITE_MEMBER.replace(':id', orgId);
            const response = await apiClient.post(endpoint, payload);

            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = response.error as { details?: { retry_after?: number } } | undefined;
                    const retryAfter = errorData?.details?.retry_after || 5;
                    return {
                        success: false,
                        status: response.status,
                        error: `Rate limited. Please retry after ${retryAfter} seconds.`,
                    };
                }

                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to invite member'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationMember,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while inviting member',
            };
        }
    }

    /**
     * Remove a member from an organization
     */
    async removeMember(orgId: string, userId: string): Promise<OrganizationServiceResponse<void>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.REMOVE_MEMBER
                .replace(':id', orgId)
                .replace(':user_id', userId);
            const response = await apiClient.delete(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to remove member'),
                };
            }

            return {
                success: true,
                status: response.status,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while removing member',
            };
        }
    }

    // --------------------------------------------------------------------------
    // Analytics Operations
    // --------------------------------------------------------------------------

    /**
     * Get organization dashboard with comprehensive analytics
     */
    async getDashboard(orgId: string): Promise<OrganizationServiceResponse<OrganizationDashboard>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.DASHBOARD.replace(':id', orgId);
            const response = await apiClient.get(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get dashboard'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationDashboard,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting dashboard',
            };
        }
    }

    /**
     * Get organization quota information
     */
    async getQuota(orgId: string): Promise<OrganizationServiceResponse<OrganizationQuota>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.QUOTA.replace(':id', orgId);
            const response = await apiClient.get(endpoint);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get quota'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationQuota,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting quota',
            };
        }
    }

    /**
     * Get organization usage analytics
     * @param orgId - Organization ID
     * @param period - Time period ('7d', '30d', '90d', '365d')
     */
    async getUsage(orgId: string, period: '7d' | '30d' | '90d' | '365d' = '30d'): Promise<OrganizationServiceResponse<OrganizationUsage>> {
        try {
            const endpoint = API_ENDPOINTS.ORGANIZATIONS.USAGE.replace(':id', orgId);
            const url = `${endpoint}?period=${period}`;
            const response = await apiClient.get(url);

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    error: extractApiErrorMessage(response.error, 'Failed to get usage'),
                };
            }

            return {
                success: true,
                status: response.status,
                data: response.data as OrganizationUsage,
            };
        } catch {
            return {
                success: false,
                error: 'Network error while getting usage',
            };
        }
    }
}

// Export singleton instance
export const organizationService = new OrganizationService();
