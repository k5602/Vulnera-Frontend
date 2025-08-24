import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteCompression from "vite-plugin-compression";
// Image optimization plugin removed due to audit issues; prefer pre-optimized assets

export default defineConfig(({ mode }) => ({
    plugins: [
        tailwindcss(),
        viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
        viteCompression({ algorithm: "gzip", ext: ".gz" }),
    ],
    esbuild: {
        // Strip console and debugger only in production builds
        drop: mode === "production" ? ["console", "debugger"] : [],
    },
    build: {
        target: "es2019",
        minify: "esbuild",
        cssMinify: true,
        sourcemap: false,
        reportCompressedSize: true,
        chunkSizeWarningLimit: 600,
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ["jszip"],
                },
            },
        },
    },
}));
