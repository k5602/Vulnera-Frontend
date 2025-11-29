export const prerender = false;

import type { APIRoute } from 'astro';
import { serverFetch, createJsonResponse, API_ENDPOINTS } from '../../../../utils/api/server-client';

interface FixResponse {
  confidence: number;
  explanation: string;
  fixed_code: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { vulnerability_id, context, language, vulnerable_code } = body || {};

    // Validate required fields
    if (!vulnerability_id) {
      return new Response(JSON.stringify({ error: 'Missing vulnerability_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use centralized serverFetch - automatically forwards cookies and CSRF
    const response = await serverFetch<FixResponse>(
      request,
      API_ENDPOINTS.LLM.FIX,
      {
        method: 'POST',
        body: {
          vulnerability_id,
          context: context || 'N/A',
          language: language || 'javascript',
          vulnerable_code: vulnerable_code || 'Vulnerability reference',
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
