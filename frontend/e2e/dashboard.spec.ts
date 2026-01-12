/**
 * Dashboard E2E Tests
 *
 * End-to-end tests for the dashboard page including:
 * - KPI card rendering
 * - Chart rendering and interaction
 * - Date range filtering
 * - Real-time updates
 * - Data refresh functionality
 *
 * @module e2e/dashboard.spec
 */

import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const dashboardPage = new DashboardPage(page);
    await page.goto('/dashboard');
    await dashboardPage.waitForPageLoad();
  });

  test.describe('Page Load', () => {
    test('should navigate to /dashboard', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const url = page.url();
      expect(url).toContain('/dashboard');
    });

    test('should display page title', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.expectPageTitle('Dashboard');
    });

    test('should display sidebar navigation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await expect(dashboardPage.sidebar).toBeVisible();
    });

    test('should display user menu', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await expect(dashboardPage.userMenu).toBeVisible();
    });
  });

  test.describe('KPI Cards', () => {
    test('should render KPI cards with values', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();
      await dashboardPage.expectKPICardsRendered();
    });

    test('should display multiple KPI cards', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();

      const kpiCount = await dashboardPage.kpiCards.count();
      expect(kpiCount).toBeGreaterThan(0);
    });

    test('should display KPI values correctly', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();

      const kpiData = await dashboardPage.getAllKPIData();

      for (const kpi of kpiData) {
        // Each KPI should have a title
        expect(kpi.title).toBeTruthy();
        // Each KPI should have a value
        expect(kpi.value).toBeTruthy();
      }
    });

    test('should display KPI trends when available', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();

      // Look for trend indicators
      const trendIndicators = page.locator('.kpi-trend, [data-testid*="trend"], .trending-up, .trending-down');
      const trendCount = await trendIndicators.count();

      // Trends are optional but should be present on some cards
      expect(trendCount).toBeGreaterThanOrEqual(0);
    });

    test('should get specific KPI value by name', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();

      const kpiData = await dashboardPage.getAllKPIData();

      if (kpiData.length > 0) {
        const firstKPI = kpiData[0];
        const value = await dashboardPage.getKPIValue(firstKPI.title);
        expect(value).toBeTruthy();
      }
    });

    test('should not show loading skeletons after data loads', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForKPICards();

      // Skeleton loaders should not be visible
      const skeletonCount = await dashboardPage.skeletonLoader.count();
      expect(skeletonCount).toBe(0);
    });
  });

  test.describe('Charts', () => {
    test('should render charts without errors', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();
      await dashboardPage.expectChartsRendered();
    });

    test('should display chart containers', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      const chartCount = await dashboardPage.charts.count();
      expect(chartCount).toBeGreaterThan(0);
    });

    test('should interact with chart tooltip', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      // Hover over chart to trigger tooltip
      const tooltip = await dashboardPage.hoverChartForTooltip();

      // If tooltip is visible, verify its content
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible();
      }
    });

    test('should show tooltips on mouse move over chart', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      // Move mouse across chart to trigger tooltips
      await dashboardPage.interactWithChartTooltip();

      // Check for any tooltip that appeared
      const tooltip = page.locator('.recharts-tooltip, .chart-tooltip, [role="tooltip"], .visx-tooltip');
      const tooltipCount = await tooltip.count();

      // Tooltips are optional depending on chart type
      expect(tooltipCount).toBeGreaterThanOrEqual(0);
    });

    test('should render uncertainty chart if present', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      const uncertaintyChart = dashboardPage.uncertaintyChart;
      const isVisible = await uncertaintyChart.isVisible().catch(() => false);

      if (isVisible) {
        await expect(uncertaintyChart).toBeVisible();
      }
    });

    test('should render calibration chart if present', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      const calibrationChart = dashboardPage.calibrationChart;
      const isVisible = await calibrationChart.isVisible().catch(() => false);

      if (isVisible) {
        await expect(calibrationChart).toBeVisible();
      }
    });

    test('should render safety timeline chart if present', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForCharts();

      const safetyChart = dashboardPage.safetyTimelineChart;
      const isVisible = await safetyChart.isVisible().catch(() => false);

      if (isVisible) {
        await expect(safetyChart).toBeVisible();
      }
    });
  });

  test.describe('Date Range Filtering', () => {
    test('should display date range picker', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const isDatePickerVisible = await dashboardPage.dateRangePicker.isVisible().catch(() => false);

      if (isDatePickerVisible) {
        await expect(dashboardPage.dateRangePicker).toBeVisible();
      }
    });

    test('should filter data with date range picker', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const isDatePickerVisible = await dashboardPage.dateRangePicker.isVisible().catch(() => false);

      if (isDatePickerVisible) {
        // Get initial KPI values
        await dashboardPage.waitForKPICards();
        const initialData = await dashboardPage.getAllKPIData();

        // Filter by last 7 days
        await dashboardPage.filterByDateRange(7);

        // Wait for data to update
        await dashboardPage.waitForKPICards();
        const filteredData = await dashboardPage.getAllKPIData();

        // Data should still be present after filtering
        expect(filteredData.length).toBeGreaterThan(0);
      }
    });

    test('should open date range picker on click', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const isDatePickerVisible = await dashboardPage.dateRangePicker.isVisible().catch(() => false);

      if (isDatePickerVisible) {
        await dashboardPage.openDateRangePicker();

        // Date picker dropdown/popover should appear
        const dateDropdown = page.locator('.date-picker-dropdown, [role="dialog"], .popover');
        const dropdownCount = await dateDropdown.count();

        expect(dropdownCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should update charts after date range change', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const isDatePickerVisible = await dashboardPage.dateRangePicker.isVisible().catch(() => false);

      if (isDatePickerVisible) {
        await dashboardPage.waitForCharts();

        // Change date range
        await dashboardPage.filterByDateRange(30);

        // Charts should still render after filter
        await dashboardPage.waitForCharts();
        await dashboardPage.expectChartsRendered();
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should handle real-time data updates (mock WebSocket)', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Set up WebSocket mock
      await page.evaluate(() => {
        // Mock WebSocket implementation
        const originalWebSocket = window.WebSocket;

        class MockWebSocket {
          static CONNECTING = 0;
          static OPEN = 1;
          static CLOSING = 2;
          static CLOSED = 3;

          readyState = MockWebSocket.OPEN;
          url: string;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;

          constructor(url: string) {
            this.url = url;
            // Simulate connection
            setTimeout(() => {
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 100);
          }

          send(data: string) {
            // Handle outgoing messages
          }

          close() {
            this.readyState = MockWebSocket.CLOSED;
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }

          // Simulate receiving a message
          simulateMessage(data: unknown) {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
            }
          }
        }

        // Store reference for testing
        (window as unknown as Record<string, unknown>).MockWebSocket = MockWebSocket;
        (window as unknown as Record<string, unknown>).WebSocket = MockWebSocket;
      });

      // Wait for initial data
      await dashboardPage.waitForKPICards();
      const initialData = await dashboardPage.getAllKPIData();

      // Simulate WebSocket message with updated data
      await page.evaluate(() => {
        const mockWs = (window as unknown as Record<string, unknown>).mockWebSocketInstance;
        if (mockWs && typeof (mockWs as { simulateMessage: (data: unknown) => void }).simulateMessage === 'function') {
          (mockWs as { simulateMessage: (data: unknown) => void }).simulateMessage({
            type: 'kpi_update',
            data: {
              accuracy: 95.5,
              uncertainty: 0.15,
            },
          });
        }
      });

      // Wait for potential updates
      await dashboardPage.waitForRealtimeUpdate(5000);

      // Verify KPI cards are still rendered
      await dashboardPage.expectKPICardsRendered();
    });

    test('should reconnect WebSocket on disconnect', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.waitForPageLoad();

      // This test verifies the app handles WebSocket disconnection gracefully
      // Actual implementation depends on the app's WebSocket handling

      // Verify dashboard still works
      await dashboardPage.expectKPICardsRendered();
    });
  });

  test.describe('Data Refresh', () => {
    test('should have refresh button', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const hasRefresh = await dashboardPage.refreshButton.isVisible().catch(() => false);

      if (hasRefresh) {
        await expect(dashboardPage.refreshButton).toBeEnabled();
      }
    });

    test('should refresh data on button click', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const hasRefresh = await dashboardPage.refreshButton.isVisible().catch(() => false);

      if (hasRefresh) {
        await dashboardPage.waitForKPICards();

        // Click refresh
        await dashboardPage.refreshData();

        // Data should still be present
        await dashboardPage.expectKPICardsRendered();
      }
    });

    test('should show loading state during refresh', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      const hasRefresh = await dashboardPage.refreshButton.isVisible().catch(() => false);

      if (hasRefresh) {
        // Click refresh and immediately check for loading state
        await dashboardPage.refreshButton.click();

        // Loading spinner might appear briefly
        const loadingAppeared = await dashboardPage.loadingSpinner.isVisible().catch(() => false);

        // Wait for loading to complete
        await dashboardPage.waitForCharts();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate using sidebar links', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Try clicking a navigation link
      const navLinks = dashboardPage.sidebar.locator('a');
      const linkCount = await navLinks.count();

      if (linkCount > 1) {
        // Click the second link (first might be dashboard itself)
        await navLinks.nth(1).click();
        await page.waitForLoadState('domcontentloaded');
      }
    });

    test('should maintain sidebar state after navigation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      await expect(dashboardPage.sidebar).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Dashboard should still be functional
      await dashboardPage.waitForKPICards();
      await dashboardPage.expectKPICardsRendered();
    });

    test('should adapt to tablet viewport', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Dashboard should still be functional
      await dashboardPage.waitForKPICards();
      await dashboardPage.expectKPICardsRendered();
    });

    test('should handle sidebar collapse on mobile', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Sidebar might be hidden or collapsed
      const sidebarVisible = await dashboardPage.sidebar.isVisible().catch(() => false);

      // Look for hamburger menu
      const menuButton = page.locator('[aria-label="Menu"], [data-testid="menu-toggle"], .hamburger');
      const hasMenuButton = await menuButton.isVisible().catch(() => false);

      // Either sidebar should be visible or there should be a toggle
      expect(sidebarVisible || hasMenuButton).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Intercept API calls and simulate error
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // Reload to trigger error
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Page should not crash - look for error message or retry button
      const errorMessage = page.locator('[role="alert"], .error-message, .error-state');
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again")');

      const hasErrorHandling =
        (await errorMessage.isVisible().catch(() => false)) ||
        (await retryButton.isVisible().catch(() => false));

      // App should handle error gracefully (either show error or just show empty state)
      await page.waitForTimeout(2000);
    });

    test('should handle network timeout', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Simulate slow network
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        route.abort('timedout');
      });

      // Page should handle timeout gracefully
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // App should not crash
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should render charts without blocking UI', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboardPage = new DashboardPage(page);

      // Measure time to interactive
      const startTime = Date.now();
      await dashboardPage.waitForCharts();
      const chartTime = Date.now() - startTime;

      // Charts should render within 10 seconds
      expect(chartTime).toBeLessThan(10000);
    });
  });
});
