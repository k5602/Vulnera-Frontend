/**
 * Environment Configuration System (patched)
 * - Adds explicit allowlist entry for back.ashycliff-f83ff693.italynorth.azurecontainerapps.io
 * - Keeps a safe wildcard for *.azurecontainerapps.io
 * - Supports Vite env, window.VulneraRuntimeConfig, process.env, and defaults
 */
function getEnvironmentConfig() {
  const readImportMeta = (key) => (typeof import.meta !== "undefined" ? import.meta.env?.[key] : undefined);

  const getEnvVar = (viteKey, windowKey, processKey, defaultValue) => {
    // 1) Vite build-time env
    const v = readImportMeta(viteKey);
    if (v !== undefined && v !== "") return v;

    // 2) Window runtime: support both direct window.<KEY> and VulneraRuntimeConfig
    if (typeof window !== "undefined") {
      const w = window[windowKey];
      if (w !== undefined && w !== null && w !== "") return w;

      try {
        const runtime = window.VulneraRuntimeConfig;
        if (runtime) {
          let rc = null;
          if (typeof runtime.getConfig === "function") rc = runtime.getConfig();
          else if (runtime.config) rc = runtime.config;

          if (rc) {
            const map = {
              VITE_API_BASE_URL: "apiBaseUrl",
              VITE_API_VERSION: "apiVersion",
              VITE_APP_NAME: "appName",
              VITE_APP_VERSION: "appVersion",
              VITE_ENABLE_DEBUG: "enableDebug",
              VITE_API_TIMEOUT: "apiTimeout",
              VITE_ENVIRONMENT: "environment",
              VITE_ALLOWED_ORIGINS: "allowedOrigins",
            };
            const mapped = map[viteKey];
            if (mapped && rc[mapped] !== undefined && rc[mapped] !== "") return rc[mapped];
          }
        }
      } catch (e) {
        // ignore runtime-config read errors
      }
    }

    // 3) Node process.env (for SSR / node builds)
    if (typeof process !== "undefined" && process.env && process.env[processKey]) {
      return process.env[processKey];
    }

    // 4) default
    return defaultValue;
  };

  const config = {
    API_BASE_URL: getEnvVar(
      "VITE_API_BASE_URL",
      "VULNERA_API_BASE_URL",
      "API_BASE_URL",
      "http://localhost:3000"
    ),

    API_VERSION: getEnvVar("VITE_API_VERSION", "VULNERA_API_VERSION", "API_VERSION", "v1"),

    APP_NAME: getEnvVar("VITE_APP_NAME", "VULNERA_APP_NAME", "APP_NAME", "Vulnera"),

    APP_VERSION: getEnvVar("VITE_APP_VERSION", "VULNERA_APP_VERSION", "APP_VERSION", "1.0.0"),

    ENABLE_DEBUG: getEnvVar(
      "VITE_ENABLE_DEBUG",
      "VULNERA_ENABLE_DEBUG",
      "ENABLE_DEBUG",
      typeof import.meta !== "undefined" && import.meta.env?.DEV ? "true" : "false"
    ),

    API_TIMEOUT: parseInt(
      getEnvVar("VITE_API_TIMEOUT", "VULNERA_API_TIMEOUT", "API_TIMEOUT", "30000"),
      10
    ),

    ENVIRONMENT: getEnvVar(
      "VITE_ENVIRONMENT",
      "VULNERA_ENVIRONMENT",
      "NODE_ENV",
      typeof import.meta !== "undefined" ? import.meta.env?.MODE || "development" : "development"
    ),
  };

  // Allowed origins - accept either env patterns or sensible defaults (including explicit back.ashycliff and azurecontainerapps wildcard)
  const rawAllowedOrigins = getEnvVar(
    "VITE_ALLOWED_ORIGINS",
    "VULNERA_ALLOWED_ORIGINS",
    "ALLOWED_ORIGINS",
    ""
  );

  const defaultOriginPatterns = [
    "^http://localhost:\\d+$",
    "^https://api\\.vulnera\\.dev$",
    "^https://staging\\.vulnera\\.dev$",
    // explicit backend URL (your provided backend)
    "^https://back\\.ashycliff-f83ff693\\.italynorth\\.azurecontainerapps\\.io$",
    // safe wildcard for apps under azurecontainerapps
    "^https://.*\\.azurecontainerapps\\.io(:\\d+)?$",
  ];

  const originPatterns = (rawAllowedOrigins || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const patternsToUse = originPatterns.length ? originPatterns : defaultOriginPatterns;

  const allowedOrigins = patternsToUse
    .map((p) => {
      try {
        if (/^https?:\/\//i.test(p)) {
          const escaped = p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&").replace(/\\\\\*/g, ".*");
          return new RegExp(`^${escaped}$`);
        }
        if (/^\^|[\$\(\)\[\]\?\\]/.test(p)) {
          return new RegExp(p);
        }
        const domain = p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&").replace(/\\\\\*/g, ".*");
        return new RegExp(`^https?://${domain}(?::\\d+)?$`);
      } catch (err) {
        console.warn("Ignored invalid allowed origin pattern:", p, err?.message || "");
        return null;
      }
    })
    .filter(Boolean);

  // Validate API_BASE_URL
  try {
    if (typeof config.API_BASE_URL === "string") {
      config.API_BASE_URL = config.API_BASE_URL.trim();
    }
    new URL(config.API_BASE_URL);
  } catch {
    console.warn("Invalid API_BASE_URL, falling back to localhost:3000:", config.API_BASE_URL);
    config.API_BASE_URL = "http://localhost:3000";
  }

  // If none of the allowed origin regexes match, fallback to localhost
  if (!allowedOrigins.some((r) => r.test(config.API_BASE_URL))) {
    console.warn("Blocked unsafe API_BASE_URL value (not in allowlist):", config.API_BASE_URL);
    config.API_BASE_URL = "http://localhost:3000";
  }

  // Remove trailing slash
  if (typeof config.API_BASE_URL === "string") {
    config.API_BASE_URL = config.API_BASE_URL.replace(/\/+$/, "");
  }

  config.API_ENDPOINT = `${config.API_BASE_URL.replace(/\/+$/, "")}/api/${config.API_VERSION}`;

  // Freeze only in production and only if using a non-cloud-host that you whitelist
  if (
    config.ENVIRONMENT === "production" &&
    typeof config.API_BASE_URL === "string" &&
    !/\.azurecontainerapps\.io$/.test(config.API_BASE_URL)
  ) {
    Object.freeze(config);
  }

  return config;
}

const CONFIG = getEnvironmentConfig();
export { CONFIG };
