/**
 * LLM Service
 * Typed API methods for LLM-related endpoints
 * Uses apiClient internally for consistent CSRF/auth handling
 */

import { apiClient, type ApiResponse } from './client';
import { API_ENDPOINTS } from '../../config/api';
import { logger } from '../logger';

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
        logger.debug('llmService.explain: Request initiated', {
            vulnerability_id: payload.vulnerability_id,
            description: payload.description,
            affected_component: payload.affected_component,
            audience: payload.audience,
            endpoint: API_ENDPOINTS.LLM.EXPLAIN,
        });

        // Validate required fields
        if (!payload.vulnerability_id) {
            logger.error('llmService.explain: Missing vulnerability_id', {
                payload,
            });
            return {
                ok: false,
                status: 400,
                error: 'Missing vulnerability_id',
            };
        }

        if (!payload.description) {
            logger.error('llmService.explain: Missing description', {
                payload,
            });
            return {
                ok: false,
                status: 400,
                error: 'Missing description',
            };
        }

        if (!payload.affected_component) {
            logger.error('llmService.explain: Missing affected_component', {
                payload,
            });
            return {
                ok: false,
                status: 400,
                error: 'Missing affected_component',
            };
        }

        const requestPayload = {
            vulnerability_id: payload.vulnerability_id,
            description: payload.description,
            affected_component: payload.affected_component,
            audience: payload.audience || 'technical',
        };

        logger.debug('llmService.explain: Sending request', {
            url: API_ENDPOINTS.LLM.EXPLAIN,
            payload: requestPayload,
        });

        try {
            const response = await apiClient.post<ExplainResponse>(
                API_ENDPOINTS.LLM.EXPLAIN,
                requestPayload
            );

            console.log(response);
            

            logger.debug('llmService.explain: Response received', {
                ok: response.ok,
                status: response.status,
                hasData: !!response.data,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data as any) : [],
                hasError: !!response.error,
                error: response.error,
            });

            if (response.data) {
                logger.debug('llmService.explain: Response data details', {
                    summary: response.data.summary?.substring(0, 100) || 'N/A',
                    explanation: response.data.explanation?.substring(0, 100) || 'N/A',
                    impact: response.data.impact?.substring(0, 100) || 'N/A',
                    technical_details: response.data.technical_details?.substring(0, 100) || 'N/A',
                    remediation: response.data.remediation?.substring(0, 100) || 'N/A',
                    confidence: response.data.confidence,
                });
            }

            return response;
        } catch (error) {
            logger.error('llmService.explain: Exception caught', {
                vulnerability_id: payload.vulnerability_id,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                error,
            });
            throw error;
        }
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
        logger.debug('llmService.fix: Request initiated', {
            vulnerability_id: payload.vulnerability_id,
            context: payload.context,
            language: payload.language,
            hasVulnerableCode: !!payload.vulnerable_code,
            vulnerableCodePreview: payload.vulnerable_code?.substring(0, 50) || 'N/A',
            endpoint: API_ENDPOINTS.LLM.FIX,
        });

        // Validate required fields
        if (!payload.vulnerability_id) {
            logger.error('llmService.fix: Missing vulnerability_id', {
                payload,
            });
            return {
                ok: false,
                status: 400,
                error: 'Missing vulnerability_id',
            };
        }

        const requestPayload = {
            vulnerability_id: payload.vulnerability_id,
            context: payload.context || 'N/A',
            language: payload.language || 'javascript',
            vulnerable_code: payload.vulnerable_code || 'Vulnerability reference',
        };

        logger.debug('llmService.fix: Sending request', {
            url: API_ENDPOINTS.LLM.FIX,
            payload: {
                vulnerability_id: requestPayload.vulnerability_id,
                context: requestPayload.context,
                language: requestPayload.language,
                vulnerableCodeLength: requestPayload.vulnerable_code.length,
            },
        });

        try {
            const response = await apiClient.post<FixResponse>(
                API_ENDPOINTS.LLM.FIX,
                requestPayload
            );

            logger.debug('llmService.fix: Response received', {
                ok: response.ok,
                status: response.status,
                hasData: !!response.data,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data as any) : [],
                hasError: !!response.error,
                error: response.error,
            });

            if (response.data) {
                logger.debug('llmService.fix: Response data details', {
                    confidence: response.data.confidence,
                    explanation: response.data.explanation?.substring(0, 100) || 'N/A',
                    fixedCodeLength: response.data.fixed_code?.length || 0,
                    fixedCodePreview: response.data.fixed_code?.substring(0, 100) || 'N/A',
                });
            }

            return response;
        } catch (error) {
            logger.error('llmService.fix: Exception caught', {
                vulnerability_id: payload.vulnerability_id,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                error,
            });
            throw error;
        }
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
        logger.debug('llmService.query: Request initiated', {
            queryLength: payload.query.length,
            queryPreview: payload.query.substring(0, 50),
            hasContext: !!payload.context,
            contextPreview: payload.context?.substring(0, 50) || 'N/A',
            endpoint: API_ENDPOINTS.LLM.QUERY,
        });

        // Validate required fields
        if (!payload.query) {
            logger.error('llmService.query: Missing query', {
                payload,
            });
            return {
                ok: false,
                status: 400,
                error: 'Missing query',
            };
        }

        const requestPayload = {
            query: payload.query,
            context: payload.context || '',
        };

        logger.debug('llmService.query: Sending request', {
            url: API_ENDPOINTS.LLM.QUERY,
            payload: {
                queryLength: requestPayload.query.length,
                contextLength: requestPayload.context.length,
            },
        });

        try {
            const response = await apiClient.post<QueryResponse>(
                API_ENDPOINTS.LLM.QUERY,
                requestPayload
            );

            logger.debug('llmService.query: Response received', {
                ok: response.ok,
                status: response.status,
                hasData: !!response.data,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data as any) : [],
                hasError: !!response.error,
                error: response.error,
            });

            if (response.data) {
                logger.debug('llmService.query: Response data details', {
                    response: response.data.response?.substring(0, 100) || 'N/A',
                    answer: response.data.answer?.substring(0, 100) || 'N/A',
                    referencesCount: response.data.references?.length || 0,
                    confidence: response.data.confidence,
                });
            }

            return response;
        } catch (error) {
            logger.error('llmService.query: Exception caught', {
                queryPreview: payload.query.substring(0, 50),
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                error,
            });
            throw error;
        }
    }
}

// Export singleton instance
export const llmService = new LlmService();

// Export class for testing
export { LlmService };
