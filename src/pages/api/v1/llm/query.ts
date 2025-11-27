// src/pages/api/v1/llm/query.ts
export const prerender = false;

import type { APIRoute } from 'astro';

const PUBLIC_API_BASE = process.env.PUBLIC_API_BASE_URL || "http://localhost:3000";

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { query, context = "" } = body || {};

        if (!query || typeof query !== "string") {
            return new Response(JSON.stringify({ error: "Missing or invalid 'query' field" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Forward request to the actual LLM backend
        // Default to localhost:8000 if not set, to avoid self-recursion loop with frontend on 3000
        const apiBase = PUBLIC_API_BASE === "http://localhost:3000" ? "http://localhost:8000" : PUBLIC_API_BASE;
        const llmUrl = `${apiBase.replace(/\/$/, "")}/api/v1/llm/query`;

        // Prevent infinite recursion if the target URL matches the current request URL
        const currentUrl = new URL(request.url);
        if (llmUrl.includes(currentUrl.host) && llmUrl.endsWith(currentUrl.pathname)) {
            return new Response(JSON.stringify({
                error: "Misconfiguration: API loop detected",
                details: "PUBLIC_API_BASE points to this same server. Please set it to the backend URL."
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const llmRes = await fetch(llmUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ context, query }),
            // (اختياري) add credentials or auth header here if backend requires
        }).catch(fetchError => {
            console.error(`[LLM Proxy] Failed to connect to backend at ${llmUrl}:`, fetchError);
            throw fetchError;
        });

        // If backend returned non-ok, forward error information
        if (!llmRes.ok) {
            const text = await llmRes.text().catch(() => null);
            return new Response(JSON.stringify({
                error: "LLM backend error",
                status: llmRes.status,
                details: text || undefined
            }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Parse JSON response from LLM backend
        const data = await llmRes.json().catch(() => null);
        if (!data) {
            return new Response(JSON.stringify({
                error: "Invalid JSON from LLM backend"
            }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Ensure response shape: { answer, references }
        const answer = data.answer || data.data || "";
        const references = Array.isArray(data.references) ? data.references : (data.refs || []);

        return new Response(JSON.stringify({ answer, references }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Server error",
            message: err instanceof Error ? err.message : String(err)
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
