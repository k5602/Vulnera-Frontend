export const prerender = false;

import type { APIRoute } from 'astro';
import { API_ENDPOINTS } from '../../../../../config/api';

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

    // Read backend base from environment (PUBLIC_API_BASE)
    const base = process.env.PUBLIC_API_BASE || '';
    if (!base) {
      return new Response(JSON.stringify({ error: 'Backend not configured (set PUBLIC_API_BASE)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedBase = (base as string).replace(/\/$/, '');
    const endpoint = API_ENDPOINTS.LLM.ENRICH.replace(':job_id', job_id);
    const backendUrl = `${normalizedBase}${endpoint}`;

    const enrichRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ finding_ids, code_contexts }),
    });

    const data = await enrichRes.json();

    if (!enrichRes.ok) {
      return new Response(JSON.stringify({ error: 'Enrichment backend error', details: data }), {
        status: Math.max(500, enrichRes.status),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: enrichRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
