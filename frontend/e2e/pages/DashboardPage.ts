/**
 * DashboardPage Page Object
 *
 * Page object pattern implementation for the dashboard page.
 * Provides reusable methods for dashboard-related E2E tests.
 *
 * @module e2e/pages/DashboardPage
 */

import { Page, Locator, expect } from '@playwright/test';

export interface KPICardData {
  title: string;
  value: string;
  trend?: string;
  change?: string;
}

export class DashboardPage {
  readonly page: Page;

  // Navigation elements
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly userName: Locator;
  readonly logoutButton: Locator;
  readonly notificationBell: Locator;

  // KPI Cards
  readonly kpiCards: Locator;
  readonly kpiCardContainer: Locator;

  // Charts
  readonly charts: Locator;
  readonly chartContainer: Locator;
  readonly lineChart: Locator;
  readonly barChart: Locator;
  readonly uncertaintyChart: Locator;
  readonly calibrationChart: Locator;
  readonly safetyTimelineChart: Locator;

  // Filters
  readonly dateRangePicker: Locator;
  readonly dateRangeStart: Locator;
  readonly dateRangeEnd: Locator;
  readonly filterDropdown: Locator;
  readonly refreshButton: Locator;

  // Loading states
  readonly loadingSpinner: Locator;
  readonly skeletonLoader: Locator;

  // Page elements
  readonly pageTitle: Locator;
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation elements
    this.sidebar = page.locator(
      '[data-testid="sidebar"], aside, nav[role="navigation"]'
    );
    this.userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], .user-menu'
    );
    this.userName = page.locator(
      '[data-testid="user-name"], .user-name, [aria-label="User name"]'
    );
    this.logoutButton = page.locator(
      '[data-testid="logout-button"], button:has-text("Logout"), button:has-text("Sign out")'
    );
    this.notificationBell = page.locator(
      '[data-testid="notifications"], [aria-label="Notifications"]'
    );

    // KPI Cards
    this.kpiCards = page.locator('[data-testid^="kpi-card-"], .kpi-card');
    this.kpiCardContainer = page.locator(
      '[data-testid="kpi-container"], .kpi-grid, .kpi-container'
    );

    // Charts
    this.charts = page.locator(
      '[data-testid^="chart-"], .chart, svg.recharts-surface, canvas'
    );
    this.chartContainer = page.locator(
      '[data-testid="chart-container"], .chart-container'
    );
    this.lineChart = page.locator(
      '[data-testid="line-chart"], .recharts-line, .line-chart'
    );
    this.barChart = page.locator(
      '[data-testid="bar-chart"], .recharts-bar, .bar-chart'
    );
    this.uncertaintyChart = page.locator(
      '[data-testid="uncertainty-chart"], .uncertainty-chart'
    );
    this.calibrationChart = page.locator(
      '[data-testid="calibration-chart"], .calibration-chart'
    );
    this.safetyTimelineChart = page.locator(
      '[data-testid="safety-timeline-chart"], .safety-timeline-chart'
    );

    // Filters
    this.dateRangePicker = page.locator(
      '[data-testid="date-range-picker"], .date-range-picker, [aria-label="Date range"]'
    );
    this.dateRangeStart = page.locator(
      '[data-testid="date-start"], input[name="startDate"], .date-start'
    );
    this.dateRangeEnd = page.locator(
      '[data-testid="date-end"], input[name="endDate"], .date-end'
    );
    this.filterDropdown = page.locator(
      '[data-testid="filter-dropdown"], .filter-dropdown'
    );
    this.refreshButton = page.locator(
      '[data-testid="refresh-button"], button[aria-label="Refresh"], button:has-text("Refresh")'
    );

    // Loading states
    this.loadingSpinner = page.locator(
      '[data-testid="loading-spinner"], .loading-spinner, [role="progressbar"]'
    );
    this.skeletonLoader = page.locator('.skeleton, [data-testid="skeleton"]');

    // Page elements
    this.pageTitle = page.locator(
      '[data-testid="page-title"], h1, .page-title'
    );
    this.breadcrumb = page.locator(
      '[data-testid="breadcrumb"], nav[aria-label="Breadcrumb"], .breadcrumb'
    );
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the dashboard page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for initial content to be visible
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      // Network idle might timeout, that's okay
    });
  }

  /**
   * Wait for all charts to render
   */
  async waitForCharts() {
    // Wait for any chart elements to appear
    await this.charts.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      // Charts might not be present on all dashboard views
    });

    // Wait for loading states to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Spinner might not be present
    });

    // Additional wait for chart animations to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for KPI cards to load
   */
  async waitForKPICards() {
    await this.kpiCards.first().waitFor({ state: 'visible', timeout: 10000 });
    // Wait for skeleton loaders to disappear
    const skeletonCount = await this.skeletonLoader.count();
    if (skeletonCount > 0) {
      await this.skeletonLoader.first().waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Get the value of a specific KPI card by name
   * @param name - The KPI card title/name
   */
  async getKPIValue(name: string): Promise<string> {
    const kpiCard = this.page.locator(
      `[data-testid="kpi-card-${name.toLowerCase().replace(/\s+/g, '-')}"], ` +
        `.kpi-card:has-text("${name}"), ` +
        `[aria-label*="${name}"]`
    );

    // Find the value within the KPI card
    const valueElement = kpiCard.locator(
      '.kpi-value, [data-testid="kpi-value"], .text-2xl, .text-3xl, .text-4xl'
    ).first();

    return await valueElement.textContent() || '';
  }

  /**
   * Get all KPI card data
   */
  async getAllKPIData(): Promise<KPICardData[]> {
    const cards = await this.kpiCards.all();
    const data: KPICardData[] = [];

    for (const card of cards) {
      const title = await card.locator('h3, .kpi-title, [data-testid="kpi-title"]').textContent() || '';
      const value = await card.locator('.kpi-value, [data-testid="kpi-value"], .text-2xl, .text-3xl').first().textContent() || '';
      const trendElement = card.locator('.kpi-trend, [data-testid="kpi-trend"]');
      const trend = await trendElement.isVisible() ? await trendElement.textContent() || undefined : undefined;

      data.push({ title: title.trim(), value: value.trim(), trend: trend?.trim() });
    }

    return data;
  }

  /**
   * Assert that KPI cards are rendered with values
   */
  async expectKPICardsRendered() {
    await expect(this.kpiCards.first()).toBeVisible();
    const count = await this.kpiCards.count();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Assert that charts are rendered without errors
   */
  async expectChartsRendered() {
    // Check for chart elements (SVG or Canvas)
    const chartCount = await this.charts.count();

    if (chartCount === 0) {
      // If no charts found, check for chart containers
      await expect(this.chartContainer.first()).toBeVisible();
    } else {
      await expect(this.charts.first()).toBeVisible();
    }

    // Ensure no error messages are displayed
    const errorMessage = this.page.locator('.chart-error, [data-testid="chart-error"]');
    const errorCount = await errorMessage.count();
    expect(errorCount).toBe(0);
  }

  /**
   * Hover over a chart to show tooltip
   * @param chartSelector - The chart to interact with
   */
  async hoverChartForTooltip(chartSelector?: Locator) {
    const chart = chartSelector || this.charts.first();
    await chart.hover();

    // Wait for tooltip to appear
    const tooltip = this.page.locator(
      '.recharts-tooltip, .chart-tooltip, [role="tooltip"], .visx-tooltip'
    );
    await tooltip.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // Tooltip might not appear on all chart types
    });

    return tooltip;
  }

  /**
   * Interact with chart tooltip by moving mouse over data points
   */
  async interactWithChartTooltip() {
    const chart = this.charts.first();
    const box = await chart.boundingBox();

    if (box) {
      // Move mouse across the chart to trigger tooltips
      for (let i = 0; i < 5; i++) {
        const x = box.x + (box.width * (i + 1)) / 6;
        const y = box.y + box.height / 2;
        await this.page.mouse.move(x, y);
        await this.page.waitForTimeout(200);
      }
    }
  }

  /**
   * Open the date range picker
   */
  async openDateRangePicker() {
    await this.dateRangePicker.click();
  }

  /**
   * Select a date range
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  async selectDateRange(startDate: string, endDate: string) {
    await this.openDateRangePicker();

    // Fill date inputs
    await this.dateRangeStart.fill(startDate);
    await this.dateRangeEnd.fill(endDate);

    // Apply the filter (click outside or apply button)
    const applyButton = this.page.locator(
      'button:has-text("Apply"), button:has-text("OK"), [data-testid="apply-filter"]'
    );
    if (await applyButton.isVisible()) {
      await applyButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * Filter data using the date range picker
   * @param days - Number of days to filter (e.g., 7 for last 7 days)
   */
  async filterByDateRange(days: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    await this.selectDateRange(formatDate(startDate), formatDate(endDate));
    await this.waitForCharts();
  }

  /**
   * Click the refresh button and wait for data to reload
   */
  async refreshData() {
    await this.refreshButton.click();
    await this.waitForCharts();
  }

  /**
   * Open the user menu
   */
  async openUserMenu() {
    await this.userMenu.click();
    await this.page.waitForTimeout(300); // Wait for menu animation
  }

  /**
   * Get the displayed user name
   */
  async getUserName(): Promise<string> {
    await this.openUserMenu();
    const name = await this.userName.textContent();
    return name?.trim() || '';
  }

  /**
   * Click logout button
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
  }

  /**
   * Assert user menu shows the expected name
   * @param expectedName - The expected user name
   */
  async expectUserName(expectedName: string) {
    await this.openUserMenu();
    await expect(this.userName).toContainText(expectedName);
  }

  /**
   * Click a navigation link in the sidebar
   * @param linkText - The text of the link to click
   */
  async navigateTo(linkText: string) {
    const link = this.sidebar.locator(`a:has-text("${linkText}")`);
    await link.click();
  }

  /**
   * Assert the page title
   * @param expectedTitle - The expected title
   */
  async expectPageTitle(expectedTitle: string) {
    await expect(this.pageTitle).toContainText(expectedTitle);
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for real-time update (WebSocket data)
   * This monitors for DOM changes in chart/KPI areas
   */
  async waitForRealtimeUpdate(timeout: number = 10000) {
    // Create a promise that resolves when content changes
    const contentChanged = new Promise<void>((resolve) => {
      let resolved = false;

      const observer = this.page.evaluate(() => {
        return new Promise<void>((observerResolve) => {
          const target = document.querySelector('.kpi-container, .chart-container, main');
          if (!target) {
            observerResolve();
            return;
          }

          const observer = new MutationObserver(() => {
            observer.disconnect();
            observerResolve();
          });

          observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true,
          });

          // Timeout after specified duration
          setTimeout(() => {
            observer.disconnect();
            observerResolve();
          }, 10000);
        });
      });

      observer.then(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });
    });

    await Promise.race([
      contentChanged,
      this.page.waitForTimeout(timeout),
    ]);
  }

  /**
   * Take a screenshot of the dashboard
   * @param name - The screenshot name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `playwright-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}
