/// <reference types="astro/client" />

/**
 * Type declarations for Astro virtual modules
 * These modules are provided by Astro at build/runtime
 */
declare module 'astro:middleware' {
    import type { MiddlewareHandler, APIContext } from 'astro';

    export function defineMiddleware(
        handler: (
            context: APIContext,
            next: () => Promise<Response>
        ) => Response | Promise<Response> | void | Promise<void>
    ): MiddlewareHandler;

    export function sequence(...handlers: MiddlewareHandler[]): MiddlewareHandler;
}
