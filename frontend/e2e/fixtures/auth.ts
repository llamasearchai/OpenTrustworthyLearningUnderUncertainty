/**
 * Authentication Fixtures
 *
 * Custom Playwright fixtures for authenticated test scenarios.
 * Provides reusable authentication state across tests.
 *
 * @module e2e/fixtures/auth
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state file path for authenticated sessions
const STORAGE_STATE_PATH = path.join(__dirname, '../../playwright/.auth/user.json');

// Test user credentials - should be configured via environment variables in CI
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
  name: process.env.TEST_USER_NAME || 'Test User',
};

// Admin user credentials
const ADMIN_USER = {
  email: process.env.ADMIN_USER_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_USER_PASSWORD || 'adminpassword123',
  name: process.env.ADMIN_USER_NAME || 'Admin User',
};

/**
 * Custom fixture types
 */
type AuthFixtures = {
  /** Page with authenticated user session */
  authenticatedPage: Page;
  /** Page with admin user session */
  adminPage: Page;
  /** Login page object */
  loginPage: LoginPage;
  /** Dashboard page object */
  dashboardPage: DashboardPage;
  /** Test user credentials */
  testUser: typeof TEST_USER;
  /** Admin user credentials */
  adminUser: typeof ADMIN_USER;
  /** Storage state path */
  storageStatePath: string;
};

/**
 * Custom fixture options
 */
type AuthOptions = {
  /** Whether to auto-login before tests */
  autoLogin: boolean;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures & AuthOptions>({
  // Default options
  autoLogin: [false, { option: true }],

  // Test user credentials fixture
  testUser: TEST_USER,

  // Admin user credentials fixture
  adminUser: ADMIN_USER,

  // Storage state path fixture
  storageStatePath: STORAGE_STATE_PATH,

  // Login page fixture
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  // Dashboard page fixture
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Authenticated page fixture - uses saved storage state
  authenticatedPage: async ({ browser, storageStatePath }, use) => {
    // Try to use existing storage state, or create new authenticated session
    let context: BrowserContext;

    try {
      // Attempt to use saved authentication state
      context = await browser.newContext({
        storageState: storageStatePath,
      });
    } catch {
      // If no storage state exists, create a new authenticated session
      context = await browser.newContext();
      const page = await context.newPage();
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);
      await loginPage.waitForRedirect('/dashboard');

      // Save the storage state for future use
      await context.storageState({ path: storageStatePath });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Admin page fixture - similar to authenticated but with admin credentials
  adminPage: async ({ browser }, use) => {
    const adminStoragePath = path.join(__dirname, '../../playwright/.auth/admin.json');

    let context: BrowserContext;

    try {
      context = await browser.newContext({
        storageState: adminStoragePath,
      });
    } catch {
      context = await browser.newContext();
      const page = await context.newPage();
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login(ADMIN_USER.email, ADMIN_USER.password);
      await loginPage.waitForRedirect('/dashboard');

      await context.storageState({ path: adminStoragePath });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

/**
 * Helper function to setup authentication state for a project
 * This can be used in a global setup file
 */
export async function globalAuthSetup(browser: import('@playwright/test').Browser): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const loginPage = new LoginPage(page);

  // Login as test user
  await loginPage.goto();
  await loginPage.login(TEST_USER.email, TEST_USER.password);

  try {
    await loginPage.waitForRedirect('/dashboard');
    // Save storage state
    await context.storageState({ path: STORAGE_STATE_PATH });
  } catch (error) {
    console.warn('Failed to setup authentication state:', error);
  }

  await context.close();
}

/**
 * Helper function to clear authentication state
 */
export async function clearAuthState(): Promise<void> {
  const fs = await import('fs');
  const authDir = path.join(__dirname, '../../playwright/.auth');

  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Failed to clear auth state:', error);
  }
}

/**
 * Mock authentication for tests that don't need real backend
 * Injects authentication tokens directly into storage
 */
export async function mockAuthentication(
  page: Page,
  user: { email: string; name: string; role?: string } = TEST_USER
): Promise<void> {
  // Mock JWT token
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  // Set authentication in localStorage
  await page.evaluate(
    ({ token, userData }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    },
    {
      token: mockToken,
      userData: {
        email: user.email,
        name: user.name,
        role: user.role || 'user',
      },
    }
  );

  // Set cookies if your app uses cookie-based auth
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: mockToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Wait for authentication to be ready after page load
 */
export async function waitForAuth(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    // Wait for authentication indicators
    await page.waitForFunction(
      () => {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        return !!(token && user);
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

// Re-export expect for convenience
export { expect } from '@playwright/test';
