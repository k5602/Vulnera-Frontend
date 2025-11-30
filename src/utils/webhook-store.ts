/**
 * Webhook Store
 * Manages webhook secrets, subscriptions, and result storage for scan jobs
 * 
 * Features:
 * - Per-user webhook secret generation and storage
 * - Localhost detection for automatic polling fallback
 * - Job result subscriptions with cleanup
 * - Event broadcasting for webhook results
 */

import type { WebhookConfig, WebhookPayload } from '../types/api';
import { logger } from './logger';

// Storage keys
const WEBHOOK_SECRET_KEY = '__vulnera_webhook_secret';

// In-memory storage for webhook results and subscribers
const webhookResults = new Map<string, WebhookPayload>();
const jobSubscribers = new Map<string, Set<(data: WebhookPayload) => void>>();

/**
 * Generate a cryptographically secure UUID v4
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Check if running in localhost/development environment
 * Used to determine if webhook callbacks are reachable
 */
export function isLocalhostEnv(): boolean {
    if (typeof window === 'undefined') {
        // SSR context - assume production
        return false;
    }

    const hostname = window.location.hostname;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname);
}

/**
 * Get or create the user's webhook secret
 * Secret format: whsec_<uuid>
 */
export function getWebhookSecret(): string {
    if (typeof localStorage === 'undefined') {
        // SSR context - generate ephemeral secret
        return `whsec_${generateUUID()}`;
    }

    let secret = localStorage.getItem(WEBHOOK_SECRET_KEY);

    if (!secret) {
        secret = `whsec_${generateUUID()}`;
        localStorage.setItem(WEBHOOK_SECRET_KEY, secret);
        logger.debug('Generated new webhook secret');
    }

    return secret;
}

/**
 * Build webhook configuration for a scan job
 * Returns null if in localhost environment (webhook unreachable)
 */
export function getWebhookConfig(): WebhookConfig | null {
    // Skip webhook in localhost - backend can't reach us
    if (isLocalhostEnv()) {
        logger.debug('Localhost detected, webhook disabled - will use polling');
        return null;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    const origin = window.location.origin;
    const callbackUrl = `${origin}/api/v1/webhooks/scan-complete`;

    return {
        callback_url: callbackUrl,
        webhook_secret: getWebhookSecret(),
    };
}

/**
 * Store a webhook result for a job
 * Called by the webhook receiver endpoint
 */
export function storeWebhookResult(jobId: string, data: WebhookPayload): void {
    webhookResults.set(jobId, data);

    // Notify all subscribers for this job
    const subscribers = jobSubscribers.get(jobId);
    if (subscribers) {
        subscribers.forEach((callback) => {
            try {
                callback(data);
            } catch (err) {
                logger.error('Webhook subscriber error', err);
            }
        });
    }

    // Dispatch global event for any listeners
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('vulnera:webhook-result', {
                detail: { jobId, data },
            })
        );
    }

    logger.info('Webhook result stored and broadcasted', { jobId, status: data.status });
}

/**
 * Get stored webhook result for a job
 */
export function getWebhookResult(jobId: string): WebhookPayload | undefined {
    return webhookResults.get(jobId);
}

/**
 * Check if a webhook result exists for a job
 */
export function hasWebhookResult(jobId: string): boolean {
    return webhookResults.has(jobId);
}

/**
 * Subscribe to webhook results for a specific job
 * Returns cleanup function to unsubscribe
 */
export function subscribeToJob(
    jobId: string,
    callback: (data: WebhookPayload) => void
): () => void {
    if (!jobSubscribers.has(jobId)) {
        jobSubscribers.set(jobId, new Set());
    }

    const subscribers = jobSubscribers.get(jobId)!;
    subscribers.add(callback);

    logger.debug('Subscribed to job webhook', { jobId });

    // Check if result already exists
    const existingResult = webhookResults.get(jobId);
    if (existingResult) {
        // Immediately invoke callback with existing result
        try {
            callback(existingResult);
        } catch (err) {
            logger.error('Webhook subscriber error on existing result', err);
        }
    }

    // Return cleanup function
    return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
            jobSubscribers.delete(jobId);
        }
        logger.debug('Unsubscribed from job webhook', { jobId });
    };
}

/**
 * Clear webhook result for a job (cleanup after processing)
 */
export function clearWebhookResult(jobId: string): void {
    webhookResults.delete(jobId);
    jobSubscribers.delete(jobId);
}

/**
 * Verify HMAC-SHA256 signature from webhook payload
 * Uses Web Crypto API for secure verification
 */
export async function verifyWebhookSignature(
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

        // Constant-time comparison to prevent timing attacks
        if (signature.length !== computedSignature.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < signature.length; i++) {
            result |= signature.charCodeAt(i) ^ computedSignature.charCodeAt(i);
        }

        return result === 0;
    } catch (err) {
        logger.error('Webhook signature verification failed', err);
        return false;
    }
}

/**
 * Export webhook store utilities for testing
 */
export const webhookStore = {
    isLocalhostEnv,
    getWebhookSecret,
    getWebhookConfig,
    storeWebhookResult,
    getWebhookResult,
    hasWebhookResult,
    subscribeToJob,
    clearWebhookResult,
    verifyWebhookSignature,
};

export default webhookStore;
