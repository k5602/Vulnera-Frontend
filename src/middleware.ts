import { defineMiddleware } from 'astro:middleware';
import { logger } from './utils/logger';

/**
 * API Proxy Middleware
 * Proxies API requests to the backend to avoid mixed-content issues
 * (HTTPS frontend → HTTP backend)
 */
export const onRequest = defineMiddleware(async (context, next) => {
    const { request } = context;
    const url = new URL(request.url);

    // Check if this is an API request
    const isApiRequest = url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/health') ||
        url.pathname.startsWith('/metrics');

    if (!isApiRequest) {
        return next();
    }

    // Get backend URL from environment
    const backendUrl = process.env.PUBLIC_API_BASE;
    
    if (!backendUrl) {
        console.warn('[Middleware] PUBLIC_API_BASE not set, API requests will fail');
        return new Response(
            JSON.stringify({ error: 'Backend URL not configured' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Build the target URL
        const targetUrl = new URL(url.pathname + url.search, backendUrl);
        
        logger.debug('[Middleware] Proxying request', {
            from: url.pathname,
            to: targetUrl.href,
            method: request.method,
        });

        // Clone the request to modify it
        const proxyRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            // Preserve credentials (cookies, auth)
            credentials: 'include',
            duplex: 'half',
        } as any);

        // Forward the request to the backend
        const response = await fetch(proxyRequest);

        // Clone the response to add CORS headers
        const clonedResponse = response.clone();
        const newHeaders = new Headers(clonedResponse.headers);
        
        // Add CORS headers to allow requests
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

        // Return the proxied response with CORS headers
        return new Response(clonedResponse.body, {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers: newHeaders,
        });
    } catch (error) {
        logger.error('[Middleware] Proxy error', {
            path: url.pathname,
            error: error instanceof Error ? error.message : String(error),
        });

        return new Response(
            JSON.stringify({ 
                error: 'Proxy error',
                details: error instanceof Error ? error.message : String(error),
            }),
            { 
                status: 502, 
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
});
