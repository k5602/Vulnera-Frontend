import { apiClient, type ApiResponse } from './client';

export interface EnrichedFinding {
    id: string;
    explanation: string;
    remediation_suggestion: string;
    risk_summary: string;
    enrichment_successful: boolean;
    enrichment_error?: string;
}

export interface EnrichmentResponse {
    job_id: string;
    enriched_count: number;
    failed_count: number;
    findings: EnrichedFinding[];
}

export const enrichService = {
    /**
     * Trigger AI enrichment for a specific job
     */
    enrichJob: async (
        jobId: string,
        payload: {
            finding_ids: string[];
            code_contexts: Record<string, string>;
        }
    ): Promise<ApiResponse<EnrichmentResponse>> => {
        return apiClient.post<EnrichmentResponse>(`/api/v1/jobs/${jobId}/enrich`, payload);
    }
};
