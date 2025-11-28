/// <reference types="vite/client" />

/**
 * Type declarations for import.meta.env
 * Extends Vite's default ImportMetaEnv with project-specific environment variables
 */
interface ImportMetaEnv {
    /** Base URL for API requests */
    readonly PUBLIC_API_BASE?: string;
    /** Force API base URL override (bypass auto-detection) */
    readonly PUBLIC_FORCE_API_BASE?: string;
    /** API request timeout in milliseconds */
    readonly PUBLIC_API_TIMEOUT?: string;
    /** Vite development mode flag */
    readonly DEV: boolean;
    /** Vite production mode flag */
    readonly PROD: boolean;
    /** Current build mode (development/production/test) */
    readonly MODE: string;
    /** Server-side rendering flag */
    readonly SSR?: boolean;
    /** Base URL for assets */
    readonly BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
