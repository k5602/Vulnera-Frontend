export const prerender = false;

import type { APIRoute } from 'astro';
import { serverFetch, createJsonResponse, API_ENDPOINTS } from '../../../../utils/api/server-client';

interface ExplainResponse {
  summary?: string;
  explanation?: string;
  impact?: string;
  technical_details?: string;
  remediation?: string;
  confidence?: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { vulnerability_id, description, affected_component, audience } = body || {};

    // Validate required fields
    if (!vulnerability_id) {
      return new Response(JSON.stringify({ error: 'Missing vulnerability_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!description) {
      return new Response(JSON.stringify({ error: 'Missing description' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!affected_component) {
      return new Response(JSON.stringify({ error: 'Missing affected_component' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use centralized serverFetch - automatically forwards cookies and CSRF
    const response = await serverFetch<ExplainResponse>(
      request,
      API_ENDPOINTS.LLM.EXPLAIN,
      {
        method: 'POST',
        body: {
          vulnerability_id,
          description,
          affected_component,
          audience: audience || 'technical',
        },
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
