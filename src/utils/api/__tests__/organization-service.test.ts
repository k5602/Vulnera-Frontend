/**
 * Organization Service Tests
 * Tests for organization management, members, and analytics
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { organizationService, OrganizationService } from '../organization-service';
import { setCsrfToken, clearAuth, __resetStorageInitFlag } from '../auth-store';

// Helper to create mock fetch response
const createMockResponse = (ok: boolean, status: number, data: unknown = {}) => ({
    ok,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(data)),
});

describe('Organization Service', () => {
    beforeEach(() => {
        localStorage.clear();
        __resetStorageInitFlag();
        vi.clearAllMocks();
        setCsrfToken('test-csrf-token');
    });

    afterEach(() => {
        localStorage.clear();
        __resetStorageInitFlag();
        clearAuth();
    });

    // =========================================================================
    // List Organizations
    // =========================================================================
    describe('list', () => {
        it('should return organizations on success', async () => {
            const mockOrgs = [
                { id: 'org-1', name: 'Org 1', slug: 'org-1' },
                { id: 'org-2', name: 'Org 2', slug: 'org-2' },
            ];
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, mockOrgs));

            const result = await organizationService.list();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data![0].name).toBe('Org 1');
        });

        it('should handle API errors', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 500, { message: 'Internal error' })
            );

            const result = await organizationService.list();

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
        });

        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await organizationService.list();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });
    });

    // =========================================================================
    // Create Organization
    // =========================================================================
    describe('create', () => {
        it('should create organization successfully', async () => {
            const newOrg = { id: 'org-new', name: 'New Org', slug: 'new-org' };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 201, newOrg));

            const result = await organizationService.create({
                name: 'New Org',
                description: 'Test organization',
            });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('New Org');
        });

        it('should handle rate limiting (429)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 429, {
                    error: 'Rate limited',
                    details: { retry_after: 30 },
                })
            );

            const result = await organizationService.create({ name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.status).toBe(429);
            expect(result.error).toContain('30 seconds');
        });

        it('should include CSRF token in request', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 201, {}));

            await organizationService.create({ name: 'Test' });

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[1].headers['X-CSRF-Token']).toBe('test-csrf-token');
        });
    });

    // =========================================================================
    // Get Organization
    // =========================================================================
    describe('get', () => {
        it('should get organization by ID', async () => {
            const org = { id: 'org-123', name: 'Test Org', slug: 'test-org' };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, org));

            const result = await organizationService.get('org-123');

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('org-123');
        });

        it('should handle not found (404)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 404, { message: 'Organization not found' })
            );

            const result = await organizationService.get('nonexistent');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
        });
    });

    // =========================================================================
    // Update Organization
    // =========================================================================
    describe('update', () => {
        it('should update organization successfully', async () => {
            const updated = { id: 'org-123', name: 'Updated Name', slug: 'updated' };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, updated));

            const result = await organizationService.update('org-123', { name: 'Updated Name' });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe('Updated Name');
        });

        it('should handle validation errors (400)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 400, { message: 'Invalid name' })
            );

            const result = await organizationService.update('org-123', { name: '' });

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
        });
    });

    // =========================================================================
    // Delete Organization
    // =========================================================================
    describe('delete', () => {
        it('should delete organization successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 204, null));

            const result = await organizationService.delete('org-123');

            expect(result.success).toBe(true);
        });

        it('should handle forbidden (403)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 403, { message: 'Only owner can delete' })
            );

            const result = await organizationService.delete('org-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(403);
        });
    });

    // =========================================================================
    // Leave Organization
    // =========================================================================
    describe('leave', () => {
        it('should leave organization successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            const result = await organizationService.leave('org-123');

            expect(result.success).toBe(true);
        });

        it('should handle owner cannot leave error', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 400, { message: 'Owner cannot leave organization' })
            );

            const result = await organizationService.leave('org-123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Owner cannot leave');
        });
    });

    // =========================================================================
    // Transfer Ownership
    // =========================================================================
    describe('transferOwnership', () => {
        it('should transfer ownership successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            const result = await organizationService.transferOwnership('org-123', { new_owner_id: 'user-456' });

            expect(result.success).toBe(true);
        });

        it('should handle not authorized (403)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 403, { message: 'Not authorized' })
            );

            const result = await organizationService.transferOwnership('org-123', { new_owner_id: 'user-456' });

            expect(result.success).toBe(false);
            expect(result.status).toBe(403);
        });
    });

    // =========================================================================
    // Organization Stats
    // =========================================================================
    describe('getStats', () => {
        it('should return organization stats', async () => {
            const stats = {
                total_scans: 100,
                total_vulnerabilities: 50,
                critical_count: 5,
                high_count: 15,
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, stats));

            const result = await organizationService.getStats('org-123');

            expect(result.success).toBe(true);
            expect(result.data?.total_scans).toBe(100);
            expect(result.data?.critical_count).toBe(5);
        });
    });

    // =========================================================================
    // List Members
    // =========================================================================
    describe('listMembers', () => {
        it('should return organization members', async () => {
            const members = [
                { user_id: 'user-1', email: 'user1@example.com', role: 'owner' },
                { user_id: 'user-2', email: 'user2@example.com', role: 'member' },
            ];
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, members));

            const result = await organizationService.listMembers('org-123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data![0].role).toBe('owner');
        });
    });

    // =========================================================================
    // Invite Member
    // =========================================================================
    describe('inviteMember', () => {
        it('should invite member successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(true, 200, { message: 'Invitation sent' })
            );

            const result = await organizationService.inviteMember('org-123', {
                email: 'new@example.com',
                role: 'member',
            });

            expect(result.success).toBe(true);
        });

        it('should handle duplicate invitation (409)', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 409, { message: 'User already a member' })
            );

            const result = await organizationService.inviteMember('org-123', {
                email: 'existing@example.com',
            });

            expect(result.success).toBe(false);
            expect(result.status).toBe(409);
        });
    });

    // =========================================================================
    // Remove Member
    // =========================================================================
    describe('removeMember', () => {
        it('should remove member successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            const result = await organizationService.removeMember('org-123', 'user-456');

            expect(result.success).toBe(true);
        });

        it('should handle cannot remove owner error', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                createMockResponse(false, 400, { message: 'Cannot remove organization owner' })
            );

            const result = await organizationService.removeMember('org-123', 'owner-id');

            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // Dashboard
    // =========================================================================
    describe('getDashboard', () => {
        it('should return organization dashboard', async () => {
            const dashboard = {
                organization: { id: 'org-123', name: 'Test Org' },
                stats: { total_scans: 50 },
                quota: { scans_remaining: 100 },
                recent_scans: [],
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, dashboard));

            const result = await organizationService.getDashboard('org-123');

            expect(result.success).toBe(true);
            expect(result.data?.stats.total_scans).toBe(50);
        });
    });

    // =========================================================================
    // Quota
    // =========================================================================
    describe('getQuota', () => {
        it('should return organization quota', async () => {
            const quota = {
                plan: 'pro',
                scans_limit: 1000,
                scans_used: 250,
                scans_remaining: 750,
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, quota));

            const result = await organizationService.getQuota('org-123');

            expect(result.success).toBe(true);
            expect(result.data?.scans_remaining).toBe(750);
        });
    });

    // =========================================================================
    // Usage Analytics
    // =========================================================================
    describe('getUsage', () => {
        it('should return usage analytics with default period', async () => {
            const usage = {
                period_start: '2024-01-01',
                period_end: '2024-01-31',
                total_scans: 100,
                daily_usage: [],
            };
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, usage));

            const result = await organizationService.getUsage('org-123');

            expect(result.success).toBe(true);
            expect(result.data?.total_scans).toBe(100);
        });

        it('should pass period parameter in URL', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await organizationService.getUsage('org-123', '90d');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=90d');
        });

        it('should handle 7d period', async () => {
            global.fetch = vi.fn().mockResolvedValue(createMockResponse(true, 200, {}));

            await organizationService.getUsage('org-123', '7d');

            const fetchCall = (global.fetch as any).mock.calls[0];
            expect(fetchCall[0]).toContain('period=7d');
        });
    });

    // =========================================================================
    // Instance Check
    // =========================================================================
    describe('Instance creation', () => {
        it('should export a singleton instance', () => {
            expect(organizationService).toBeDefined();
            expect(organizationService).toBeInstanceOf(OrganizationService);
        });
    });
});
