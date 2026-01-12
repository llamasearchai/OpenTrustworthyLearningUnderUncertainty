import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright E2E Test Configuration for OpenTLU Frontend
 *
 * Purpose: Cross-browser end-to-end testing for all critical user journeys
 * with accessibility auditing and visual regression.
 *
 * Key features:
 * - Multiple browser targets for cross-browser compatibility
 * - Mobile device simulation for responsive testing
 * - Accessibility testing with axe-core integration
 * - Visual comparison with screenshot testing
 * - Authentication state persistence with storage state
 * - Parallel execution with proper isolation
 * - Retry configuration for flaky test handling
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state paths for authenticated sessions
const STORAGE_STATE_DIR = path.join(__dirname, 'playwright/.auth');
const AUTH_FILE = path.join(STORAGE_STATE_DIR, 'user.json');

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file patterns
  testMatch: '**/*.spec.ts',

  // Parallel execution
  fullyParallel: true,

  // Fail build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry configuration - helps with flaky tests
  retries: process.env.CI ? 2 : 1,

  // Worker configuration
  // Limit workers on CI to prevent resource exhaustion
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'], // Show test results in terminal
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Global test configuration
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace on first retry for debugging
    trace: 'on-first-retry',

    // Screenshot on failure for debugging
    screenshot: 'only-on-failure',

    // Video on failure for debugging
    video: 'retain-on-failure',

    // Bypass CSP for testing
    bypassCSP: true,

    // Default viewport
    viewport: { width: 1280, height: 720 },

    // Action timeout (clicks, fills, etc.)
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Enable JavaScript (needed for most tests)
    javaScriptEnabled: true,

    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,

    // Locale for date formatting
    locale: 'en-US',

    // Timezone
    timezoneId: 'America/New_York',

    // Color scheme
    colorScheme: 'light',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Browser projects
  projects: [
    // =====================================================
    // Setup project - runs authentication setup before tests
    // =====================================================
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },

    // =====================================================
    // Desktop browsers - authenticated tests
    // =====================================================
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // =====================================================
    // Desktop browsers - unauthenticated tests (login, etc.)
    // =====================================================
    {
      name: 'chromium-no-auth',
      testMatch: ['**/auth.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // No storage state - fresh session
      },
    },

    // =====================================================
    // Mobile browsers - authenticated
    // =====================================================
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // =====================================================
    // Tablet
    // =====================================================
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // =====================================================
    // Accessibility-focused project
    // =====================================================
    {
      name: 'accessibility',
      testMatch: '**/accessibility.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // =====================================================
    // 3D/WebGL-focused project (only chromium supports WebGL well in headless)
    // =====================================================
    {
      name: '3d-viewer',
      testMatch: '**/3d-viewer.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        // WebGL configuration
        launchOptions: {
          args: [
            '--enable-webgl',
            '--use-gl=swiftshader',
            '--enable-accelerated-2d-canvas',
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration for local testing
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directory for test artifacts
  outputDir: './playwright-results',

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
    // Visual comparison settings
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled', // Disable animations for consistent screenshots
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.1,
    },
  },

  // Metadata for reports
  metadata: {
    project: 'OpenTLU E2E Tests',
    environment: process.env.NODE_ENV || 'development',
  },

  // Snapshot path template
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',

  // Global setup and teardown
  globalSetup: path.resolve(__dirname, './e2e/fixtures/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './e2e/fixtures/global-teardown.ts'),
});
