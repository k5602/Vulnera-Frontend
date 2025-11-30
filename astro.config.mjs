// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

// Load environment variables
const env = loadEnv("development", process.cwd(), "");

// Get proxy configuration - only if backend URL is configured
const getProxyConfig = () => {
    const backendUrl = env.PUBLIC_API_BASE;

    if (!backendUrl) {
        console.warn("[Astro Config] Set PUBLIC_API_BASE in .env to enable API proxying.");
        return undefined;
    }

    return {
        "/api": {
            target: backendUrl,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: "localhost",
        },
        "/health": {
            target: backendUrl,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: "localhost",
        },
        "/metrics": {
            target: backendUrl,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: "localhost",
        },
    };
};

// https://astro.build/config
export default defineConfig({
    output: "server",
    adapter: node({
        mode: "standalone",
    }),
    integrations: [react()],
    vite: {
        // @ts-ignore
        plugins: [tailwindcss()],
        server: {
            proxy: getProxyConfig(),
        },
    },

    server: {
        port: parseInt(process.env.PORT || "3000", 10),
    },

    // Enable middleware for API proxying in production
    middleware: true,
});
