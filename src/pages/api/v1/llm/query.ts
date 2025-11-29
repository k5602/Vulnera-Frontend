export const prerender = false;

import type { APIRoute } from 'astro';
import { serverFetch, createJsonResponse, API_ENDPOINTS } from '../../../../utils/api/server-client';

interface QueryResponse {
  response?: string;
  answer?: string;
  references?: string[];
  confidence?: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { query, context } = body || {};

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use centralized serverFetch - automatically forwards cookies and CSRF
    const response = await serverFetch<QueryResponse>(
      request,
      API_ENDPOINTS.LLM.QUERY,
      {
        method: 'POST',
        body: {
          query,
          context: context || '',
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
