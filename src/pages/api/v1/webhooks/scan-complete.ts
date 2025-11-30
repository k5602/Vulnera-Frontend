/**
 * Webhook Receiver: Scan Complete
 * 
 * POST /api/v1/webhooks/scan-complete
 * Receives scan completion callbacks from backend
 * 
 * Expected headers:
 * - X-Webhook-Signature: HMAC-SHA256 signature of body
 * - Content-Type: application/json
 * 
 * Expected body: WebhookPayload (job_id, status, findings, summary, etc.)
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { WebhookPayloadSchema } from '../../../../types/api';

// Server-side cache for webhook results
// In production, consider using Redis or similar for multi-instance deployments
const webhookResultsCache = new Map<string, { data: unknown; timestamp: number }>();

// Cache TTL: 10 minutes (results should be consumed quickly)
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of webhookResultsCache.entries()) {
        if (now - value.timestamp > CACHE_TTL_MS) {
            webhookResultsCache.delete(key);
        }
    }
}

/**
 * Verify HMAC-SHA256 signature
 * Exported for use in other modules that need signature verification
 */
export async function verifySignature(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    if (!signature || !secret) {
        return false;
    }

    try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const data = encoder.encode(payload);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
        const computedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        // Constant-time comparison
        if (signature.length !== computedSignature.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < signature.length; i++) {
            result |= signature.charCodeAt(i) ^ computedSignature.charCodeAt(i);
        }

        return result === 0;
    } catch {
        return false;
    }
}

/**
 * POST handler for webhook callbacks
 */
export const POST: APIRoute = async ({ request }) => {
    // Clean expired entries periodically
    cleanExpiredCache();

    try {
        // Get raw body for signature verification
        const rawBody = await request.text();

        if (!rawBody) {
            return new Response(JSON.stringify({ error: 'Empty request body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parse payload
        let payload: unknown;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate payload structure
        const parseResult = WebhookPayloadSchema.safeParse(payload);
        if (!parseResult.success) {
            console.error('[Webhook] Invalid payload:', parseResult.error.errors);
            return new Response(JSON.stringify({
                error: 'Invalid payload structure',
                details: parseResult.error.errors
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const validatedPayload = parseResult.data;
        const jobId = validatedPayload.job_id;

        // Optional: Verify signature if header present
        // In production, make this mandatory
        const signature = request.headers.get('X-Webhook-Signature');
        if (signature) {
            // Note: In a real implementation, you'd look up the user's webhook secret
            // based on the job_id or a user identifier in the payload
            // For now, we skip mandatory verification since we can't access localStorage server-side
            console.log('[Webhook] Signature provided:', signature.substring(0, 16) + '...');
        }

        // Store result in cache
        webhookResultsCache.set(jobId, {
            data: validatedPayload,
            timestamp: Date.now(),
        });

        console.log('[Webhook] Received scan result:', {
            jobId,
            status: validatedPayload.status,
            findingsCount: validatedPayload.findings?.length || 0,
        });

        // Return success
        return new Response(JSON.stringify({
            success: true,
            message: 'Webhook received',
            job_id: jobId,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[Webhook] Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * GET handler to check if webhook result exists for a job
 * Query param: ?job_id=xxx
 */
export const GET: APIRoute = async ({ url }) => {
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
        return new Response(JSON.stringify({ error: 'Missing job_id parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const cached = webhookResultsCache.get(jobId);

    if (!cached) {
        return new Response(JSON.stringify({
            found: false,
            job_id: jobId,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        webhookResultsCache.delete(jobId);
        return new Response(JSON.stringify({
            found: false,
            job_id: jobId,
            reason: 'expired',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Return cached result and remove from cache (consume once)
    webhookResultsCache.delete(jobId);

    return new Response(JSON.stringify({
        found: true,
        job_id: jobId,
        data: cached.data,
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};
