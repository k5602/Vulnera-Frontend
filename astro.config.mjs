// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

// https://astro.build/config
// Load env vars from .env file for proxy configuration
const env = loadEnv("", process.cwd(), "");
const proxyTarget = env.API_PROXY_TARGET || env.PUBLIC_API_BASE || "";
const enableProxy = Boolean(proxyTarget);

if (enableProxy) {
    console.log(`[Vulnera] Dev proxy enabled: /api -> ${proxyTarget}`);
}

export default defineConfig({
    integrations: [react()],

    server: {
        port: 3000,
    },

    // Vite configuration (shared)
    vite: {
        plugins: [tailwindcss()],
        server: enableProxy
            ? {
                  proxy: {
                      // Proxy API requests to backend in dev when target is provided
                      "/api": {
                          target: proxyTarget,
                          changeOrigin: true,
                      },
                      "/health": {
                          target: proxyTarget,
                          changeOrigin: true,
                      },
                      "/metrics": {
                          target: proxyTarget,
                          changeOrigin: true,
                      },
                  },
              }
            : undefined,
    },

    prefetch: true,
});
