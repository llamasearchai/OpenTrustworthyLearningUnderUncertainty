/**
 * LoginPage Page Object
 *
 * Page object pattern implementation for the login page.
 * Provides reusable methods for authentication-related E2E tests.
 *
 * @module e2e/pages/LoginPage
 */

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;

  // Error elements
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  // Other elements
  readonly logo: Locator;
  readonly pageTitle: Locator;
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements with multiple selector strategies for robustness
    this.emailInput = page.locator(
      '[data-testid="email-input"], input[name="email"], input[type="email"], #email'
    );
    this.passwordInput = page.locator(
      '[data-testid="password-input"], input[name="password"], input[type="password"], #password'
    );
    this.submitButton = page.locator(
      '[data-testid="login-button"], button[type="submit"], button:has-text("Login"), button:has-text("Sign in")'
    );
    this.rememberMeCheckbox = page.locator(
      '[data-testid="remember-me"], input[name="rememberMe"], #rememberMe'
    );
    this.forgotPasswordLink = page.locator(
      '[data-testid="forgot-password"], a:has-text("Forgot password"), a:has-text("Reset password")'
    );

    // Error elements
    this.errorMessage = page.locator(
      '[data-testid="error-message"], [role="alert"], .error-message, .alert-error'
    );
    this.emailError = page.locator(
      '[data-testid="email-error"], #email-error, [aria-describedby*="email"]'
    );
    this.passwordError = page.locator(
      '[data-testid="password-error"], #password-error, [aria-describedby*="password"]'
    );

    // Other elements
    this.logo = page.locator('[data-testid="logo"], .logo, header img');
    this.pageTitle = page.locator(
      '[data-testid="page-title"], h1, .page-title'
    );
    this.signUpLink = page.locator(
      '[data-testid="signup-link"], a:has-text("Sign up"), a:has-text("Create account"), a:has-text("Register")'
    );
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the login page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the email input to be visible
    await this.emailInput.first().waitFor({ state: 'visible' });
  }

  /**
   * Fill the email input field
   * @param email - The email address to enter
   */
  async fillEmail(email: string) {
    await this.emailInput.click();
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password input field
   * @param password - The password to enter
   */
  async fillPassword(password: string) {
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form by clicking the submit button
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform a complete login action
   * @param email - The email address
   * @param password - The password
   * @param options - Additional options
   */
  async login(
    email: string,
    password: string,
    options: { rememberMe?: boolean } = {}
  ) {
    await this.fillEmail(email);
    await this.fillPassword(password);

    if (options.rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.submit();
  }

  /**
   * Assert that an error message is displayed
   * @param message - The expected error message (partial match)
   */
  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  /**
   * Assert that a specific email validation error is shown
   * @param message - The expected error message
   */
  async expectEmailError(message: string) {
    await expect(this.emailError).toBeVisible();
    await expect(this.emailError).toContainText(message);
  }

  /**
   * Assert that a specific password validation error is shown
   * @param message - The expected error message
   */
  async expectPasswordError(message: string) {
    await expect(this.passwordError).toBeVisible();
    await expect(this.passwordError).toContainText(message);
  }

  /**
   * Assert that no error messages are visible
   */
  async expectNoErrors() {
    await expect(this.errorMessage).not.toBeVisible();
  }

  /**
   * Assert that the login form is visible and ready
   */
  async expectFormVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Assert that the form inputs have the correct accessibility attributes
   */
  async expectAccessibleForm() {
    // Email input should have proper label
    await expect(this.emailInput).toHaveAttribute('type', 'email');

    // Password input should have proper type
    await expect(this.passwordInput).toHaveAttribute('type', 'password');

    // Submit button should be accessible
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Clear all form inputs
   */
  async clearForm() {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Check if the email input has focus
   */
  async isEmailFocused(): Promise<boolean> {
    return await this.emailInput.evaluate(
      (el) => el === document.activeElement
    );
  }

  /**
   * Check if the password input has focus
   */
  async isPasswordFocused(): Promise<boolean> {
    return await this.passwordInput.evaluate(
      (el) => el === document.activeElement
    );
  }

  /**
   * Press Tab to move focus through form elements
   */
  async tabThroughForm() {
    await this.emailInput.press('Tab');
    await this.passwordInput.press('Tab');
    await this.submitButton.press('Tab');
  }

  /**
   * Submit form using Enter key from password field
   */
  async submitWithEnter() {
    await this.passwordInput.press('Enter');
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for navigation after login
   * @param expectedPath - The expected path after successful login
   */
  async waitForRedirect(expectedPath: string = '/dashboard') {
    await this.page.waitForURL(`**${expectedPath}*`, { timeout: 10000 });
  }
}
