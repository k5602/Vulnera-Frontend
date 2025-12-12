const ENDPOINTS = {

    ANALYSIS: {
        POST_dependencies_analyze: '/api/v1/dependencies/analyze',
        POST_analysis_job: '/api/v1/analyze/job',
        GET_jobs: (analysisJobId: string) => `/api/v1/jobs/${analysisJobId}`,
    },

    HEALTH: {
        GET_health_status: '/health',
        GET_metrics: '/metrics',
    },

    AUTH: {
        GET_api_keys: '/api/v1/auth/api-keys',
        POST_create_api_key: '/api/v1/auth/api-keys',
        DELETE_api_key: (apiKeyId: string) => `/api/v1/auth/api-keys/${apiKeyId}`,
        POST_login: '/api/v1/auth/login',
        POST_logout: '/api/v1/auth/logout',
        POST_refresh_token: '/api/v1/auth/refresh',
        POST_register: '/api/v1/auth/register',
    },

    LLM: {
        POST_enrich_job: (LLMJobId: string) => `/api/v1/jobs/${LLMJobId}/enrich`,
        POST_explain: "/api/v1/llm/explain",
        POST_fixCode: "/api/v1/llm/fix",
        POST_naturalLanguageQuery: "/api/v1/llm/query",
    },

    ORGANIZATION:{
        GET_user_org: '/api/v1/organizations',
        POST_new_org: '/api/v1/organizations',
        GET_org_details: (orgId: string) => `/api/v1/organizations/${orgId}`,
        PUT_update_org_name: (orgId: string) => `/api/v1/organizations/${orgId}`,
        DELETE_org: (orgId: string) => `/api/v1/organizations/${orgId}`,
        POST_leave_org: (orgId: string) => `/api/v1/organizations/${orgId}/leave`,
        GET_org_members: (orgId: string) => `/api/v1/organizations/${orgId}/members`,
        POST_invite_org_member: (orgId: string) => `/api/v1/organizations/${orgId}/members`,
        DELETE_org_member: (orgId: string, memberId: string) => `/api/v1/organizations/${orgId}/members/${memberId}`,
        GET_org_stats: (orgId: string) => `/api/v1/organizations/${orgId}/stats`,
        POST_transfer_ownership: (orgId: string) => `/api/v1/organizations/${orgId}/transfer`,
    },

    ORG_ANALYTICS: {
        GET_dashboard_stats: (orgId: string) => `/api/v1/organizations/${orgId}/analytics/dashboard`,
        GET_quota_usage: (orgId: string) => `/api/v1/organizations/${orgId}/analytics/quota`,
        GET_historical_usage: (orgId: string) => `/api/v1/organizations/${orgId}/analytics/usage`,
    },

    PERSONAL_ANALYTICS: {
        GET_stats: '/api/v1/me/analytics/dashboard',
        GET_historical_usage: '/api/v1/me/analytics/usage',
    }
}

export default ENDPOINTS;