import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
  getViteConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test-setup.ts',
          'src/test-utils.ts',
          '**/*.test.ts',
          '**/__tests__/**',
        ],
      },
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      testTimeout: 10000,
      hookTimeout: 10000,
    },
  })
);
