import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
    const isProd = mode === "production";

    return {
        plugins: [
            tailwindcss(),
            viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
            viteCompression({ algorithm: "gzip", ext: ".gz" }),
            ...(isProd ? [visualizer({ filename: "dist/stats.html", gzipSize: true })] : []),
        ],
        esbuild: {
            drop: isProd ? ["console", "debugger"] : [],
        },
        build: {
            target: "es2020",
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
    };
});
