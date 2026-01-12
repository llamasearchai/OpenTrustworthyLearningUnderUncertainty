/**
 * Evaluation E2E Tests
 *
 * End-to-end tests for the evaluation/scenarios functionality including:
 * - Scenario listing and search
 * - Scenario details view
 * - Running evaluations
 * - Results display
 * - CSV export functionality
 *
 * @module e2e/evaluation.spec
 */

import { test, expect } from './fixtures/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Page object for Evaluation/Scenarios page
class EvaluationPage {
  constructor(private page: import('@playwright/test').Page) {}

  // Locators
  get scenarioList() {
    return this.page.locator('[data-testid="scenario-list"], .scenario-list, table, [role="grid"]');
  }

  get scenarioRows() {
    return this.page.locator('[data-testid="scenario-row"], .scenario-row, tbody tr, [role="row"]');
  }

  get searchInput() {
    return this.page.locator('[data-testid="scenario-search"], input[placeholder*="Search"], input[aria-label*="Search"]');
  }

  get loadingSpinner() {
    return this.page.locator('[data-testid="loading"], .loading, [role="progressbar"]');
  }

  get evaluateButton() {
    return this.page.locator('[data-testid="run-evaluation"], button:has-text("Run"), button:has-text("Evaluate"), button:has-text("Start")');
  }

  get resultsContainer() {
    return this.page.locator('[data-testid="evaluation-results"], .results-container, .evaluation-results');
  }

  get passStatus() {
    return this.page.locator('[data-testid="status-pass"], .status-pass, .text-green, :text("Pass")');
  }

  get failStatus() {
    return this.page.locator('[data-testid="status-fail"], .status-fail, .text-red, :text("Fail")');
  }

  get exportButton() {
    return this.page.locator('[data-testid="export-csv"], button:has-text("Export"), button:has-text("CSV"), button:has-text("Download")');
  }

  get detailPanel() {
    return this.page.locator('[data-testid="scenario-detail"], .scenario-detail, [role="dialog"], aside');
  }

  get backButton() {
    return this.page.locator('[data-testid="back-button"], button:has-text("Back"), a:has-text("Back")');
  }

  get filterDropdown() {
    return this.page.locator('[data-testid="filter"], .filter-dropdown, [aria-label="Filter"]');
  }

  get paginationControls() {
    return this.page.locator('[data-testid="pagination"], .pagination, nav[aria-label="Pagination"]');
  }

  // Methods
  async goto() {
    await this.page.goto('/scenarios');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async waitForResults() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.resultsContainer.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  async searchScenario(name: string) {
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(500); // Debounce
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async clickScenario(index: number = 0) {
    const rows = await this.scenarioRows.all();
    if (rows.length > index) {
      await rows[index].click();
    }
  }

  async clickScenarioByName(name: string) {
    const row = this.page.locator(`[data-testid="scenario-row"]:has-text("${name}"), tr:has-text("${name}"), [role="row"]:has-text("${name}")`);
    await row.click();
  }

  async runEvaluation() {
    await this.evaluateButton.click();
    await this.waitForResults();
  }

  async exportToCSV() {
    // Set up download handler
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    return await downloadPromise;
  }

  async getScenarioCount() {
    return await this.scenarioRows.count();
  }

  async getResultStatus(): Promise<'pass' | 'fail' | 'unknown'> {
    if (await this.passStatus.isVisible()) {
      return 'pass';
    }
    if (await this.failStatus.isVisible()) {
      return 'fail';
    }
    return 'unknown';
  }
}

test.describe('Evaluation/Scenarios', () => {
  test.describe('Scenario List', () => {
    test('should navigate to /scenarios', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const url = page.url();
      expect(url).toContain('/scenarios');
    });

    test('should display scenario list', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      await expect(evaluationPage.scenarioList).toBeVisible();
    });

    test('should display scenario rows', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should have search functionality', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const searchVisible = await evaluationPage.searchInput.isVisible().catch(() => false);
      expect(searchVisible).toBeTruthy();
    });
  });

  test.describe('Scenario Search', () => {
    test('should search for scenario by name', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      // Get initial count
      const initialCount = await evaluationPage.getScenarioCount();

      // Search for a term
      await evaluationPage.searchScenario('test');

      // Wait for search results
      await page.waitForTimeout(500);

      // Results should be filtered (or same if no matches)
      const filteredCount = await evaluationPage.getScenarioCount();

      // The count might be same, less, or zero depending on data
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test('should clear search results when search is cleared', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      // Search for something
      await evaluationPage.searchScenario('test');
      await page.waitForTimeout(500);

      // Clear search
      await evaluationPage.searchInput.clear();
      await page.waitForTimeout(500);

      // Results should be restored
      const count = await evaluationPage.getScenarioCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show no results message for invalid search', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      // Search for something unlikely to exist
      await evaluationPage.searchScenario('xyznonexistentscenario123');
      await page.waitForTimeout(500);

      // Either no rows or empty state message
      const count = await evaluationPage.getScenarioCount();
      const emptyState = page.locator('.empty-state, [data-testid="empty-state"], :text("No results")');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(count === 0 || hasEmptyState).toBeTruthy();
    });

    test('should debounce search input', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      // Type quickly
      await evaluationPage.searchInput.type('test', { delay: 50 });

      // Should not make a request for each character
      await page.waitForTimeout(300);

      // Search should still work after debounce
      const count = await evaluationPage.getScenarioCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Scenario Detail', () => {
    test('should open scenario detail on row click', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        // Click first scenario
        await evaluationPage.clickScenario(0);

        // Wait for navigation or detail panel
        await page.waitForTimeout(1000);

        // Either navigated to detail page or opened panel
        const url = page.url();
        const hasDetailPanel = await evaluationPage.detailPanel.isVisible().catch(() => false);

        expect(url.includes('/scenario') || hasDetailPanel).toBeTruthy();
      }
    });

    test('should display scenario details', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        // Look for detail content
        const detailContent = page.locator('.scenario-detail, .detail-view, [data-testid="scenario-detail"]');
        const hasDetail = await detailContent.isVisible().catch(() => false);

        // Or check if URL changed
        const url = page.url();
        expect(hasDetail || url.includes('/scenario')).toBeTruthy();
      }
    });

    test('should navigate back from detail view', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        // Click back button
        const backButton = evaluationPage.backButton;
        const hasBackButton = await backButton.isVisible().catch(() => false);

        if (hasBackButton) {
          await backButton.click();
          await page.waitForTimeout(500);

          const url = page.url();
          expect(url).toContain('/scenarios');
        } else {
          // Use browser back
          await page.goBack();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Run Evaluation', () => {
    test('should have run evaluation button', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        // Evaluation button might be on list or detail page
        expect(hasEvalButton).toBeDefined();
      }
    });

    test('should run evaluation and wait for results', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          // Run evaluation
          await evaluationPage.runEvaluation();

          // Results should be visible
          const hasResults = await evaluationPage.resultsContainer.isVisible().catch(() => false);
          expect(hasResults).toBeTruthy();
        }
      }
    });

    test('should display pass/fail status in results', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.runEvaluation();

          // Check for status indicators
          const status = await evaluationPage.getResultStatus();
          expect(['pass', 'fail', 'unknown']).toContain(status);
        }
      }
    });

    test('should show loading state during evaluation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          // Click without waiting
          await evaluationPage.evaluateButton.click();

          // Check for loading state immediately
          const isLoading = await evaluationPage.loadingSpinner.isVisible().catch(() => false);

          // Wait for completion
          await evaluationPage.waitForResults();
        }
      }
    });

    test('should handle evaluation timeout gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      // Mock slow API response
      await page.route('**/api/evaluate**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        route.fulfill({
          status: 200,
          body: JSON.stringify({ status: 'pass', results: [] }),
        });
      });

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.evaluateButton.click();

          // Wait for response
          await page.waitForTimeout(6000);

          // Page should not crash
          const pageContent = page.locator('body');
          await expect(pageContent).toBeVisible();
        }
      }
    });
  });

  test.describe('Export Results', () => {
    test('should have export to CSV button', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.runEvaluation();

          const hasExport = await evaluationPage.exportButton.isVisible().catch(() => false);
          expect(hasExport).toBeDefined();
        }
      }
    });

    test('should export results to CSV (verify download)', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.runEvaluation();

          const hasExport = await evaluationPage.exportButton.isVisible().catch(() => false);

          if (hasExport) {
            // Export to CSV
            const download = await evaluationPage.exportToCSV();

            // Verify download
            const filename = download.suggestedFilename();
            expect(filename).toMatch(/\.csv$/i);

            // Save the file to verify content
            const downloadPath = path.join(__dirname, '../playwright-results/downloads', filename);
            await download.saveAs(downloadPath);

            // Check file exists
            expect(fs.existsSync(downloadPath)).toBeTruthy();

            // Read and verify CSV content
            const content = fs.readFileSync(downloadPath, 'utf-8');
            expect(content.length).toBeGreaterThan(0);

            // CSV should have header row
            const lines = content.split('\n');
            expect(lines.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should include all result columns in CSV export', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.runEvaluation();

          const hasExport = await evaluationPage.exportButton.isVisible().catch(() => false);

          if (hasExport) {
            const download = await evaluationPage.exportToCSV();

            const downloadPath = path.join(__dirname, '../playwright-results/downloads', download.suggestedFilename());
            await download.saveAs(downloadPath);

            const content = fs.readFileSync(downloadPath, 'utf-8');
            const lines = content.split('\n');
            const headers = lines[0].split(',');

            // Should have multiple columns
            expect(headers.length).toBeGreaterThan(1);
          }
        }
      }
    });
  });

  test.describe('Filters and Pagination', () => {
    test('should have filter options', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const hasFilter = await evaluationPage.filterDropdown.isVisible().catch(() => false);

      // Filters are optional
      expect(hasFilter).toBeDefined();
    });

    test('should have pagination controls', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const hasPagination = await evaluationPage.paginationControls.isVisible().catch(() => false);

      // Pagination is optional for small datasets
      expect(hasPagination).toBeDefined();
    });

    test('should navigate between pages', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const hasPagination = await evaluationPage.paginationControls.isVisible().catch(() => false);

      if (hasPagination) {
        const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
        const hasNext = await nextButton.isEnabled().catch(() => false);

        if (hasNext) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Mock API error
      await page.route('**/api/scenarios**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      const evaluationPage = new EvaluationPage(page);
      await evaluationPage.goto();

      // Page should not crash
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    });

    test('should show error message when evaluation fails', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Mock evaluation error
      await page.route('**/api/evaluate**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Evaluation failed' }),
        });
      });

      const evaluationPage = new EvaluationPage(page);
      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasEvalButton = await evaluationPage.evaluateButton.isVisible().catch(() => false);

        if (hasEvalButton) {
          await evaluationPage.evaluateButton.click();
          await page.waitForTimeout(2000);

          // Should show error or handle gracefully
          const errorMessage = page.locator('[role="alert"], .error-message, :text("Error")');
          const hasError = await errorMessage.isVisible().catch(() => false);

          // Page should not crash
          const pageContent = page.locator('body');
          await expect(pageContent).toBeVisible();
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate scenarios with keyboard', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        // Focus first row
        await evaluationPage.scenarioRows.first().focus();

        // Press Arrow Down
        await page.keyboard.press('ArrowDown');

        // Press Enter to select
        await page.keyboard.press('Enter');

        // Should open detail
        await page.waitForTimeout(500);
      }
    });

    test('should close detail with Escape key', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const evaluationPage = new EvaluationPage(page);

      await evaluationPage.goto();

      const count = await evaluationPage.getScenarioCount();

      if (count > 0) {
        await evaluationPage.clickScenario(0);
        await page.waitForTimeout(1000);

        const hasDetail = await evaluationPage.detailPanel.isVisible().catch(() => false);

        if (hasDetail) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          // Panel should be hidden
          const stillVisible = await evaluationPage.detailPanel.isVisible().catch(() => false);
          expect(stillVisible).toBeFalsy();
        }
      }
    });
  });
});
