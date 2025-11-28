export const prerender = false;

import type { APIRoute } from 'astro';
import { API_ENDPOINTS } from '../../../../config/api';

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

    // Read backend base from environment (PUBLIC_API_BASE)
    const base = process.env.PUBLIC_API_BASE || '';
    if (!base) {
      return new Response(JSON.stringify({ error: 'LLM backend not configured (set PUBLIC_API_BASE)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedBase = (base as string).replace(/\/$/, '');
    const backendUrl = `${normalizedBase}${API_ENDPOINTS.LLM.QUERY}`;

    const llmRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ context: context || '', query }),
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
