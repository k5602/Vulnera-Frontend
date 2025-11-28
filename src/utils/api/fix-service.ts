import { apiClient, type ApiResponse } from './client';

export interface FixRequest {
    context: string;
    language: string;
    vulnerability_id: string;
    vulnerable_code: string;
}

export interface FixResponse {
    confidence: number;
    explanation: string;
    fixed_code: string;
}

export const fixService = {
    /**
     * Generate a code fix for a specific vulnerability
     */
    generateFix: async (payload: FixRequest): Promise<ApiResponse<FixResponse>> => {
        return apiClient.post<FixResponse>('/api/v1/llm/fix', payload);
    }
};
