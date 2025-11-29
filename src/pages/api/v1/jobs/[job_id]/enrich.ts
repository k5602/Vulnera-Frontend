export const prerender = false;

import type { APIRoute } from 'astro';
import { serverFetch, createJsonResponse, replacePathParams, API_ENDPOINTS } from '../../../../../utils/api/server-client';

interface EnrichResponse {
  job_id: string;
  enriched_count: number;
  failed_count: number;
  findings: Array<{
    id: string;
    explanation: string;
    remediation_suggestion: string;
    risk_summary: string;
    enrichment_successful: boolean;
    enrichment_error?: string;
  }>;
}

export const POST: APIRoute = async ({ params, request }) => {
  const { job_id } = params;

  if (!job_id) {
    return new Response(JSON.stringify({ error: 'Missing job_id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { finding_ids, code_contexts } = body || {};

    // Build endpoint with job_id parameter
    const endpoint = replacePathParams(API_ENDPOINTS.LLM.ENRICH, { job_id });

    // Use centralized serverFetch - automatically forwards cookies and CSRF
    const response = await serverFetch<EnrichResponse>(
      request,
      endpoint,
      {
        method: 'POST',
        body: { finding_ids, code_contexts },
      }
    );

    // Return response using helper (forwards CSRF token from backend)
    return createJsonResponse(response);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
