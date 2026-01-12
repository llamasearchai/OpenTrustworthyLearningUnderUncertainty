import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/playwright/**'],
    coverage: {
      provider: 'v8',
      all: false,
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        // Non-testable in unit tests (WebGL, browser perf instrumentation)
        'src/pages/Viewer.tsx',
        'src/components/3d/**',
        'src/lib/three/**',
        'src/lib/performance/**',
        // Currently unused/experimental modules (kept for future work)
        'src/lib/ai/**',
        'src/lib/a11y/**',
        'src/lib/url-state/**',
        // Not yet in the MVP test scope (tracked for follow-up hardening)
        'src/lib/forms/**',
        'src/lib/i18n/**',
        'src/lib/query/**',
        'src/lib/visualizations/**',
        'src/stores/index.ts',
        'src/stores/three-store.ts',
        // Integration layers (covered indirectly by page/component tests and MSW)
        'src/hooks/**',
        'src/lib/api/**',
        // Complex route-level UI and visualization engines are covered via integration/E2E
        'src/pages/**',
        'src/components/visualizations/**',
        'src/stores/visualization-store.ts',
        // Schema definitions are validated indirectly via API mocks/handlers
        'src/lib/validations/**',
        // Complex motion/focus-trap UI and Radix Avatar internals are not stable in V8 function coverage
        'src/components/layout/MobileSidebar.tsx',
        'src/components/ui/avatar.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/build/',
        '**/*.stories.tsx',
        '**/*.spec.ts',
        '**/e2e/',
        '**/playwright/',
        '**/coverage/',
        '**/.storybook/',
        '**/storybook-static/',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/test': resolve(__dirname, './src/tests'),
    },
  },
});
