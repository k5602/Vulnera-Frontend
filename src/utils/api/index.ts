/**
 * API Services Index
 * Central export point for all API services
 */

// Core client (exports for browser)
export { apiClient, apiFetch, type ApiResponse } from "./client";

// Server-side client (SSR API routes)
export { serverFetch, createJsonResponse, replacePathParams, type ServerApiResponse, type ServerFetchOptions } from "./server-client";

// Domain services
export { authService } from "./auth-service";
export type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    RefreshResponse,
    AuthServiceResponse,
    ApiKeyResponse,
    CreateApiKeyRequest,
} from "./auth-service";

export { healthService } from "./health-service";
export { scanService } from "./scan-service";
export { enrichService } from "./enrich-service";
export { llmService } from "./llm-service";
export type {
    ExplainRequest,
    ExplainResponse,
    FixRequest,
    FixResponse,
    QueryRequest,
    QueryResponse,
} from "./llm-service";

// Organization service
export { organizationService } from "./organization-service";
export type {
    Organization,
    OrganizationMember,
    OrganizationRole,
    OrganizationStats,
    OrganizationQuota,
    OrganizationUsage,
    OrganizationDashboard,
    UsageDataPoint,
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
    InviteMemberRequest,
    TransferOwnershipRequest,
    OrganizationServiceResponse,
} from "./organization-service";

// Personal analytics service
export { meService } from "./me-service";
export type {
    PersonalDashboard,
    PersonalStats,
    PersonalQuota,
    PersonalUsage,
    PersonalScanSummary,
    TopVulnerability,
    MeServiceResponse,
} from "./me-service";

// Dependencies service
export { dependenciesService } from "./dependencies-service";
export type {
    DependencyInput,
    DependencyVulnerability,
    DependencyAnalysisResult,
    AnalyzeDependenciesRequest,
    AnalyzeDependenciesResponse,
    DependenciesServiceResponse,
} from "./dependencies-service";

// Utilities
export { requestDebouncer, RequestDebouncer, type DebounceOptions } from "./request-debounce";