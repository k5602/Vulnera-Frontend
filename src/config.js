/**
 * Environment Configuration System
 * Supports multiple environment variable sources with priority:
 * 1. Vite environment variables (VITE_*)
 * 2. Window object variables (for runtime configuration)
 * 3. Process environment variables (for Node.js environments)
 * 4. Default fallback values
 */
function getEnvironmentConfig() {
    // Helper function to get environment variable with fallback
    const getEnvVar = (viteKey, windowKey, processKey, defaultValue) => {
        // Priority 1: Vite environment variables (build-time)
        if (import.meta.env && import.meta.env[viteKey]) {
            return import.meta.env[viteKey];
        }

        // Priority 2: Window object (runtime configuration)
        if (typeof window !== "undefined" && window[windowKey]) {
            return window[windowKey];
        }

        // Priority 3: Process environment (Node.js environments)
        if (typeof process !== "undefined" && process.env && process.env[processKey]) {
            return process.env[processKey];
        }

        // Priority 4: Default fallback
        return defaultValue;
    };

    const config = {
        API_BASE_URL: getEnvVar(
            "VITE_API_BASE_URL",
            "VULNERA_API_BASE_URL",
            "API_BASE_URL",
            "http://localhost:3000",
        ),

        API_VERSION: getEnvVar("VITE_API_VERSION", "VULNERA_API_VERSION", "API_VERSION", "v1"),

        APP_NAME: getEnvVar("VITE_APP_NAME", "VULNERA_APP_NAME", "APP_NAME", "Vulnera"),

        APP_VERSION: getEnvVar("VITE_APP_VERSION", "VULNERA_APP_VERSION", "APP_VERSION", "1.0.0"),

        // Additional configuration options
        ENABLE_DEBUG: getEnvVar(
            "VITE_ENABLE_DEBUG",
            "VULNERA_ENABLE_DEBUG",
            "ENABLE_DEBUG",
            import.meta.env?.DEV ? "true" : "false",
        ),

        API_TIMEOUT: parseInt(
            getEnvVar("VITE_API_TIMEOUT", "VULNERA_API_TIMEOUT", "API_TIMEOUT", "30000"),
        ),

        ENVIRONMENT: getEnvVar(
            "VITE_ENVIRONMENT",
            "VULNERA_ENVIRONMENT",
            "NODE_ENV",
            import.meta.env?.MODE || "development",
        ),
    };

    // Validate API_BASE_URL format & allowlist (supports env: VITE_ALLOWED_ORIGINS, VULNERA_ALLOWED_ORIGINS, ALLOWED_ORIGINS)
    const rawAllowedOrigins = getEnvVar(
        "VITE_ALLOWED_ORIGINS",
        "VULNERA_ALLOWED_ORIGINS",
        "ALLOWED_ORIGINS",
        "",
    );

    const defaultOriginPatterns = [
        "^http://localhost:\\d+$",
        "^https://api\\.vulnera\\.dev$",
        "^https://staging\\.vulnera\\.dev$",
        "^https://vulnera-back\\.politeisland-d68133bc\\.switzerlandnorth\\.azurecontainerapps\\.io$",
    ];

    const originPatterns = (rawAllowedOrigins || "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

    const patternsToUse = originPatterns.length ? originPatterns : defaultOriginPatterns;

    // Build an allowlist of RegExp from patterns. Supports:
    // - Full URLs (http[s]://...) with optional '*' wildcards
    // - Raw regex (starting with ^ or ending with $)
    // - Domain-only patterns (e.g. *.example.com), optional port
    const allowedOrigins = patternsToUse
        .map((p) => {
            try {
                if (p.startsWith("http://") || p.startsWith("https://")) {
                    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
                    return new RegExp(`^${escaped}$`);
                }
                if (p.startsWith("^") || p.endsWith("$")) {
                    return new RegExp(p);
                }
                const domain = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
                return new RegExp(`^https?://${domain}(?::\\d+)?$`);
            } catch {
                console.warn("Ignored invalid allowed origin pattern:", p);
                return null;
            }
        })
        .filter(Boolean);
    try {
        new URL(config.API_BASE_URL);
    } catch {
        config.API_BASE_URL = "http://localhost:3000";
    }
    if (!allowedOrigins.some((r) => r.test(config.API_BASE_URL))) {
        console.warn("Blocked unsafe API_BASE_URL value:", config.API_BASE_URL);
        config.API_BASE_URL = "http://localhost:3000";
    }

    // Remove trailing slash from API_BASE_URL
    config.API_BASE_URL = config.API_BASE_URL.replace(/\/$/, "");

    // Build complete API endpoint
    config.API_ENDPOINT = `${config.API_BASE_URL}/api/${config.API_VERSION}`;

    // Only freeze in production AND only if we're not in a container/cloud environment
    if (
        config.ENVIRONMENT === "production" &&
        !config.API_BASE_URL.includes("azurecontainerapps.io")
    ) {
        Object.freeze(config);
    }

    return config;
}

// Initialize configuration
const CONFIG = getEnvironmentConfig();

export { CONFIG };
