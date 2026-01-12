/**
 * Global Setup for Playwright E2E Tests
 *
 * This file runs once before all tests to set up:
 * - Authenticated session storage state
 * - Test data fixtures
 * - Environment configuration
 *
 * @module e2e/fixtures/global-setup
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state file paths
const STORAGE_STATE_DIR = path.join(__dirname, '../../playwright/.auth');
const USER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'user.json');
const ADMIN_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'admin.json');

// Test user credentials from environment or defaults
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

const ADMIN_USER = {
  email: process.env.ADMIN_USER_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_USER_PASSWORD || 'adminpassword123',
};

/**
 * Authenticate a user and save the storage state
 */
async function authenticate(
  baseURL: string,
  credentials: { email: string; password: string },
  storagePath: string
): Promise<boolean> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    const emailInput = page.locator(
      '[data-testid="email-input"], input[name="email"], input[type="email"], #email'
    );
    const passwordInput = page.locator(
      '[data-testid="password-input"], input[name="password"], input[type="password"], #password'
    );
    const submitButton = page.locator(
      '[data-testid="login-button"], button[type="submit"], button:has-text("Login"), button:has-text("Sign in")'
    );

    // Wait for form to be ready
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill credentials
    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);

    // Submit form
    await submitButton.click();

    // Wait for successful login (redirect to dashboard or success indicator)
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    } catch {
      // If dashboard redirect doesn't happen, check for error
      const errorMessage = page.locator('[role="alert"], .error-message');
      if (await errorMessage.isVisible()) {
        console.warn(`Login failed for ${credentials.email}: Error message displayed`);
        return false;
      }
      // Try waiting for any navigation away from login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    }

    // Save storage state
    await context.storageState({ path: storagePath });
    console.log(`Authentication successful for ${credentials.email}`);
    return true;
  } catch (error) {
    console.warn(`Authentication setup failed for ${credentials.email}:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Create mock storage state when real authentication is not available
 */
async function createMockStorageState(storagePath: string, userEmail: string): Promise<void> {
  const mockToken = 'mock-jwt-token-for-testing';

  const mockStorageState = {
    cookies: [
      {
        name: 'auth_token',
        value: mockToken,
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + 86400, // 24 hours
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'auth_token',
            value: mockToken,
          },
          {
            name: 'user',
            value: JSON.stringify({
              email: userEmail,
              name: 'Test User',
              role: 'user',
            }),
          },
        ],
      },
    ],
  };

  fs.writeFileSync(storagePath, JSON.stringify(mockStorageState, null, 2));
  console.log(`Created mock storage state for ${userEmail}`);
}

/**
 * Global setup function
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n--- Running Global Setup ---\n');

  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Ensure storage state directory exists
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
    console.log(`Created storage state directory: ${STORAGE_STATE_DIR}`);
  }

  // Ensure downloads directory exists
  const downloadsDir = path.join(__dirname, '../../playwright-results/downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, '../../playwright-results/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Try to authenticate test user
  const userAuthSuccess = await authenticate(baseURL, TEST_USER, USER_STORAGE_STATE);

  if (!userAuthSuccess) {
    console.log('Real authentication failed, creating mock storage state...');
    await createMockStorageState(USER_STORAGE_STATE, TEST_USER.email);
  }

  // Try to authenticate admin user (optional)
  const adminAuthSuccess = await authenticate(baseURL, ADMIN_USER, ADMIN_STORAGE_STATE);

  if (!adminAuthSuccess) {
    console.log('Admin authentication failed, creating mock storage state...');
    await createMockStorageState(ADMIN_STORAGE_STATE, ADMIN_USER.email);
  }

  // Set up any additional test fixtures
  await setupTestFixtures();

  console.log('\n--- Global Setup Complete ---\n');
}

/**
 * Set up additional test fixtures (mock data, test database, etc.)
 */
async function setupTestFixtures(): Promise<void> {
  // Add any additional setup here
  // For example:
  // - Seed test database
  // - Create mock API responses
  // - Set up test feature flags

  console.log('Test fixtures setup complete');
}

export default globalSetup;
