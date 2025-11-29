export const prerender = false;

import type { APIRoute } from 'astro';
import { API_ENDPOINTS } from '../../../../config/api';

async function getCsrfTokenFromBackend(backendUrl: string): Promise<string> {
  try {
    // Try to get CSRF token from a public endpoint or via a GET request with credentials
    const csrfRes = await fetch(`${backendUrl.replace('/api/v1/llm/explain', '')}/api/v1/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    
    if (csrfRes.ok) {
      const csrfToken = csrfRes.headers.get('X-CSRF-Token');
      if (csrfToken) return csrfToken;
      
      const data = await csrfRes.json();
      if (data.csrf || data.csrf_token) {
        return data.csrf || data.csrf_token;
      }
    }
  } catch (e) {
    console.error('Failed to fetch CSRF token:', e);
  }
  return '';
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

    // Read backend base from environment (PUBLIC_API_BASE)
    const base = process.env.PUBLIC_API_BASE || '';
    if (!base) {
      return new Response(JSON.stringify({ error: 'LLM backend not configured (set PUBLIC_API_BASE)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedBase = (base as string).replace(/\/$/, '');
    const backendUrl = `${normalizedBase}${API_ENDPOINTS.LLM.EXPLAIN}`;

    // Try to get CSRF token from incoming request or fetch a new one
    let csrfToken = request.headers.get('X-CSRF-Token') || '';
    if (!csrfToken) {
      csrfToken = await getCsrfTokenFromBackend(backendUrl);
    }

    const backendHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    
    // Pass CSRF token to backend if available
    if (csrfToken) {
      backendHeaders['X-CSRF-Token'] = csrfToken;
    }

    const llmRes = await fetch(backendUrl, {
      method: 'POST',
      headers: backendHeaders,
      credentials: 'include',
      body: JSON.stringify({
        vulnerability_id,
        description,
        affected_component,
        audience: audience || 'technical',
      }),
    });

    const data = await llmRes.json();
    
    // Extract CSRF token from response and include it in the response back to client
    const responseCsrfToken = llmRes.headers.get('X-CSRF-Token');
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (responseCsrfToken) {
      responseHeaders['X-CSRF-Token'] = responseCsrfToken;
    }
    
    if (!llmRes.ok) {
      return new Response(JSON.stringify({ error: 'LLM backend error', details: data }), {
        status: Math.max(500, llmRes.status),
        headers: responseHeaders,
      });
    }

    return new Response(JSON.stringify(data), {
      status: llmRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
