/**
 * LLM Service
 * Typed API methods for LLM-related endpoints
 * Uses apiClient internally for consistent CSRF/auth handling
 */

import { apiClient, type ApiResponse } from './client';
import { API_ENDPOINTS } from '../../config/api';

// ============================================================================
// Request Types
// ============================================================================

export interface ExplainRequest {
    /** Vulnerability identifier (required) */
    vulnerability_id: string;
    /** Description of the vulnerability */
    description: string;
    /** Component affected by the vulnerability */
    affected_component: string;
    /** Target audience for the explanation (e.g., 'technical', 'executive', 'developer') */
    audience?: string;
}

export interface FixRequest {
    /** Vulnerability identifier (required) */
    vulnerability_id: string;
    /** Context around the vulnerability */
    context?: string;
    /** Programming language of the vulnerable code */
    language?: string;
    /** The vulnerable code snippet */
    vulnerable_code?: string;
}

export interface QueryRequest {
    /** The query string (required) */
    query: string;
    /** Additional context for the query */
    context?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ExplainResponse {
    /** High-level summary of the vulnerability */
    summary?: string;
    /** Direct explanation (for simple responses) */
    explanation?: string;
    /** Impact assessment */
    impact?: string;
    /** Technical details */
    technical_details?: string;
    /** Remediation steps */
    remediation?: string;
    /** Confidence score (0-1) */
    confidence?: number;
}

export interface FixResponse {
    /** Confidence score for the fix (0-1) */
    confidence: number;
    /** Explanation of the fix */
    explanation: string;
    /** The corrected code */
    fixed_code: string;
}

export interface QueryResponse {
    /** Response to the query */
    response?: string;
    /** Answer text */
    answer?: string;
    /** Additional context or references */
    references?: string[];
    /** Confidence score (0-1) */
    confidence?: number;
}

// ============================================================================
// LLM Service
// ============================================================================

class LlmService {
    /**
     * Get an AI-powered explanation of a vulnerability
     * 
     * @param payload - Explain request payload
     * @returns ApiResponse with explanation data
     * 
     * @example
     * ```typescript
     * const response = await llmService.explain({
     *   vulnerability_id: 'CVE-2023-1234',
     *   description: 'SQL injection vulnerability',
     *   affected_component: 'user-service',
     *   audience: 'technical',
     * });
     * 
     * if (response.ok) {
     *   console.log(response.data?.summary);
     * }
     * ```
     */
    async explain(payload: ExplainRequest): Promise<ApiResponse<ExplainResponse>> {
        // Validate required fields
        if (!payload.vulnerability_id) {
            return {
                ok: false,
                status: 400,
                error: 'Missing vulnerability_id',
            };
        }

        if (!payload.description) {
            return {
                ok: false,
                status: 400,
                error: 'Missing description',
            };
        }

        if (!payload.affected_component) {
            return {
                ok: false,
                status: 400,
                error: 'Missing affected_component',
            };
        }

        return apiClient.post<ExplainResponse>(API_ENDPOINTS.LLM.EXPLAIN, {
            vulnerability_id: payload.vulnerability_id,
            description: payload.description,
            affected_component: payload.affected_component,
            audience: payload.audience || 'technical',
        });
    }

    /**
     * Get an AI-powered code fix for a vulnerability
     * 
     * @param payload - Fix request payload
     * @returns ApiResponse with fix data
     * 
     * @example
     * ```typescript
     * const response = await llmService.fix({
     *   vulnerability_id: 'CVE-2023-1234',
     *   context: 'User authentication module',
     *   language: 'javascript',
     *   vulnerable_code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
     * });
     * 
     * if (response.ok) {
     *   console.log(response.data?.fixed_code);
     * }
     * ```
     */
    async fix(payload: FixRequest): Promise<ApiResponse<FixResponse>> {
        // Validate required fields
        if (!payload.vulnerability_id) {
            return {
                ok: false,
                status: 400,
                error: 'Missing vulnerability_id',
            };
        }

        return apiClient.post<FixResponse>(API_ENDPOINTS.LLM.FIX, {
            vulnerability_id: payload.vulnerability_id,
            context: payload.context || 'N/A',
            language: payload.language || 'javascript',
            vulnerable_code: payload.vulnerable_code || 'Vulnerability reference',
        });
    }

    /**
     * Send a general query to the LLM
     * 
     * @param payload - Query request payload
     * @returns ApiResponse with query response
     * 
     * @example
     * ```typescript
     * const response = await llmService.query({
     *   query: 'How do I prevent SQL injection?',
     *   context: 'Node.js application with PostgreSQL',
     * });
     * 
     * if (response.ok) {
     *   console.log(response.data?.response);
     * }
     * ```
     */
    async query(payload: QueryRequest): Promise<ApiResponse<QueryResponse>> {
        // Validate required fields
        if (!payload.query) {
            return {
                ok: false,
                status: 400,
                error: 'Missing query',
            };
        }

        return apiClient.post<QueryResponse>(API_ENDPOINTS.LLM.QUERY, {
            query: payload.query,
            context: payload.context || '',
        });
    }
}

// Export singleton instance
export const llmService = new LlmService();

// Export class for testing
export { LlmService };
