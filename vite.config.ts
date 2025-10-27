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
            chunkSizeWarningLimit: 300,
            emptyOutDir: true,
            rollupOptions: {
                // Improved tree-shaking and code splitting
                output: {
                    // Manual chunking for better optimization
                    manualChunks: (id) => {
                        if (id.includes("node_modules")) {
                            if (id.includes("framer-motion")) {
                                return "framer-motion";
                            }
                            if (id.includes("react")) {
                                return "react-vendor";
                            }
                            // Other vendor code
                            return "vendor";
                        }
                        return undefined;
                    },
                    // Optimize chunk naming for better caching
                    chunkFileNames: "chunks/[name]-[hash].js",
                    entryFileNames: "entries/[name]-[hash].js",
                    assetFileNames: "assets/[name]-[hash][extname]",
                },
                // Enable tree-shaking optimization
                treeshake: {
                    moduleSideEffects: false,
                    propertyReadSideEffects: false,
                    tryCatchDeoptimization: false,
                },
            },
            // Preload critical resources
            polyfillModulePreload: true,
        },
        // Optimize module resolution
        resolve: {
            dedupe: ["react", "react-dom"],
        },
    };
});
