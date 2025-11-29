export const prerender = false;

import type { APIRoute } from 'astro';
import { API_ENDPOINTS } from '../../../../config/api';

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

    // Read backend base from environment (PUBLIC_API_BASE)
    const base = process.env.PUBLIC_API_BASE || '';
    if (!base) {
      return new Response(JSON.stringify({ error: 'LLM backend not configured (set PUBLIC_API_BASE)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedBase = (base as string).replace(/\/$/, '');
    const backendUrl = `${normalizedBase}${API_ENDPOINTS.LLM.FIX}`;

    // Extract CSRF token from incoming request if present
    const csrfToken = request.headers.get('X-CSRF-Token');
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
      body: JSON.stringify({
        vulnerability_id,
        context: context || 'N/A',
        language: language || 'javascript',
        vulnerable_code: vulnerable_code || 'Vulnerability reference',
      }),
    });

    const data = await llmRes.json();
    if (!llmRes.ok) {
      return new Response(JSON.stringify({ error: 'LLM backend error', details: data }), {
        status: Math.max(500, llmRes.status),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: llmRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
