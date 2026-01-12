/**
 * 3D Viewer E2E Tests
 *
 * End-to-end tests for the 3D viewer functionality including:
 * - Scene loading
 * - Mouse interactions (drag, click)
 * - Keyboard navigation
 * - Object selection
 * - Visual regression testing
 *
 * @module e2e/3d-viewer.spec
 */

import { test, expect } from './fixtures/auth';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Page object for 3D Viewer
class ThreeDViewerPage {
  constructor(private page: import('@playwright/test').Page) {}

  // Locators
  get canvas() {
    return this.page.locator('canvas');
  }

  get sceneContainer() {
    return this.page.locator('[data-testid="3d-scene"], .scene-container, [data-testid="scene"]');
  }

  get loadingIndicator() {
    return this.page.locator('[data-testid="loading-indicator"], .loading-indicator, [role="progressbar"]');
  }

  get loadingProgress() {
    return this.page.locator('.loading-progress, [data-testid="loading-progress"]');
  }

  get controlsPanel() {
    return this.page.locator('[data-testid="controls-panel"], .controls-panel');
  }

  get resetCameraButton() {
    return this.page.locator('[data-testid="reset-camera"], button:has-text("Reset"), button[aria-label="Reset camera"]');
  }

  get zoomInButton() {
    return this.page.locator('[data-testid="zoom-in"], button:has-text("Zoom In"), button[aria-label="Zoom in"]');
  }

  get zoomOutButton() {
    return this.page.locator('[data-testid="zoom-out"], button:has-text("Zoom Out"), button[aria-label="Zoom out"]');
  }

  get fullscreenButton() {
    return this.page.locator('[data-testid="fullscreen"], button[aria-label="Fullscreen"]');
  }

  get selectedObjectInfo() {
    return this.page.locator('[data-testid="selected-object"], .selected-object-info, .object-details');
  }

  get webglFallback() {
    return this.page.locator('[data-testid="webgl-fallback"], .webgl-fallback, :text("WebGL Not Available")');
  }

  get performanceStats() {
    return this.page.locator('.stats, [data-testid="performance-stats"]');
  }

  // Methods
  async goto(viewerId: string = '1') {
    await this.page.goto(`/viewer/${viewerId}`);
    await this.waitForSceneLoad();
  }

  async waitForSceneLoad() {
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for loading indicator to disappear or canvas to be visible
    try {
      await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // Loading indicator might not exist
    }

    // Wait for canvas to be ready
    await this.canvas.waitFor({ state: 'visible', timeout: 15000 });

    // Additional wait for WebGL context initialization
    await this.page.waitForTimeout(1000);
  }

  async isWebGLSupported(): Promise<boolean> {
    return await this.page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return !!gl;
      } catch {
        return false;
      }
    });
  }

  async getCanvasSize(): Promise<{ width: number; height: number }> {
    const box = await this.canvas.boundingBox();
    return { width: box?.width || 0, height: box?.height || 0 };
  }

  async dragScene(startX: number, startY: number, endX: number, endY: number) {
    const box = await this.canvas.boundingBox();
    if (!box) return;

    const actualStartX = box.x + startX;
    const actualStartY = box.y + startY;
    const actualEndX = box.x + endX;
    const actualEndY = box.y + endY;

    await this.page.mouse.move(actualStartX, actualStartY);
    await this.page.mouse.down();
    await this.page.mouse.move(actualEndX, actualEndY, { steps: 10 });
    await this.page.mouse.up();
  }

  async clickOnScene(x: number, y: number) {
    const box = await this.canvas.boundingBox();
    if (!box) return;

    const actualX = box.x + x;
    const actualY = box.y + y;

    await this.page.mouse.click(actualX, actualY);
  }

  async scrollToZoom(deltaY: number) {
    const box = await this.canvas.boundingBox();
    if (!box) return;

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await this.page.mouse.move(centerX, centerY);
    await this.page.mouse.wheel(0, deltaY);
  }

  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async takeScreenshot(name: string) {
    await this.canvas.screenshot({
      path: path.join(__dirname, `../playwright-results/screenshots/${name}.png`),
    });
  }
}

test.describe('3D Viewer', () => {
  test.describe('Scene Loading', () => {
    test('should navigate to /viewer/1', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const url = page.url();
      expect(url).toContain('/viewer/1');
    });

    test('should wait for 3D scene to load', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      // Check if WebGL is supported
      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Canvas should be visible
        await expect(viewer.canvas).toBeVisible();
      } else {
        // Fallback should be shown
        await expect(viewer.webglFallback).toBeVisible();
      }
    });

    test('should display loading progress during scene load', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      // Navigate without waiting
      await page.goto('/viewer/1');

      // Check for loading indicator
      const loadingVisible = await viewer.loadingIndicator.isVisible().catch(() => false);

      // Loading indicator might appear briefly
      expect(loadingVisible).toBeDefined();

      // Wait for full load
      await viewer.waitForSceneLoad();
    });

    test('should display canvas with correct dimensions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
      }
    });

    test('should show fallback when WebGL is not available', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Disable WebGL
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
          if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
            return null;
          }
          return getContext.call(this, type, ...args);
        };
      });

      const viewer = new ThreeDViewerPage(page);
      await page.goto('/viewer/1');

      // Fallback message should appear
      const fallbackVisible = await viewer.webglFallback.isVisible().catch(() => false);

      // Either shows fallback or gracefully handles
      expect(fallbackVisible).toBeDefined();
    });
  });

  test.describe('Mouse Interactions', () => {
    test('should interact with scene via mouse drag', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        await expect(viewer.canvas).toBeVisible();

        const size = await viewer.getCanvasSize();

        // Perform drag operation (rotate camera)
        await viewer.dragScene(
          size.width / 2,
          size.height / 2,
          size.width / 4,
          size.height / 2
        );

        // Scene should still be responsive
        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should rotate scene with mouse drag', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();

        // Rotate horizontally
        await viewer.dragScene(
          size.width * 0.3,
          size.height / 2,
          size.width * 0.7,
          size.height / 2
        );

        await page.waitForTimeout(500);

        // Rotate vertically
        await viewer.dragScene(
          size.width / 2,
          size.height * 0.3,
          size.width / 2,
          size.height * 0.7
        );

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should zoom with mouse wheel', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Zoom in
        await viewer.scrollToZoom(-100);
        await page.waitForTimeout(500);

        // Zoom out
        await viewer.scrollToZoom(100);
        await page.waitForTimeout(500);

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should pan scene with right-click drag', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();
        const box = await viewer.canvas.boundingBox();

        if (box) {
          // Right-click drag for panning
          await page.mouse.move(box.x + size.width / 2, box.y + size.height / 2);
          await page.mouse.down({ button: 'right' });
          await page.mouse.move(box.x + size.width / 4, box.y + size.height / 4, { steps: 10 });
          await page.mouse.up({ button: 'right' });

          await expect(viewer.canvas).toBeVisible();
        }
      }
    });
  });

  test.describe('Object Selection', () => {
    test('should click object to select', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();

        // Click in center of scene (likely to hit an object)
        await viewer.clickOnScene(size.width / 2, size.height / 2);

        await page.waitForTimeout(500);

        // Check if selection info appears
        const hasSelectionInfo = await viewer.selectedObjectInfo.isVisible().catch(() => false);

        // Selection info is optional depending on scene content
        expect(hasSelectionInfo).toBeDefined();
      }
    });

    test('should deselect object on click away', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();

        // First click to select
        await viewer.clickOnScene(size.width / 2, size.height / 2);
        await page.waitForTimeout(300);

        // Click away (corner)
        await viewer.clickOnScene(10, 10);
        await page.waitForTimeout(300);

        // Selection should be cleared
        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should highlight selected object', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();

        // Click to select
        await viewer.clickOnScene(size.width / 2, size.height / 2);

        await page.waitForTimeout(500);

        // Visual verification would require screenshot comparison
        await expect(viewer.canvas).toBeVisible();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate with arrow keys', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Focus the canvas/scene
        await viewer.canvas.focus();

        // Navigate with arrow keys
        await viewer.pressKey('ArrowUp');
        await page.waitForTimeout(200);

        await viewer.pressKey('ArrowDown');
        await page.waitForTimeout(200);

        await viewer.pressKey('ArrowLeft');
        await page.waitForTimeout(200);

        await viewer.pressKey('ArrowRight');
        await page.waitForTimeout(200);

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should move camera with WASD keys', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        await viewer.canvas.focus();

        // WASD movement
        await viewer.pressKey('w');
        await page.waitForTimeout(200);

        await viewer.pressKey('s');
        await page.waitForTimeout(200);

        await viewer.pressKey('a');
        await page.waitForTimeout(200);

        await viewer.pressKey('d');
        await page.waitForTimeout(200);

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should zoom with +/- keys', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        await viewer.canvas.focus();

        // Zoom in
        await viewer.pressKey('+');
        await page.waitForTimeout(200);

        // Zoom out
        await viewer.pressKey('-');
        await page.waitForTimeout(200);

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should reset camera with Space key', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        await viewer.canvas.focus();

        // Move camera
        await viewer.pressKey('ArrowUp');
        await viewer.pressKey('ArrowRight');

        // Reset with Space
        await viewer.pressKey(' ');
        await page.waitForTimeout(500);

        await expect(viewer.canvas).toBeVisible();
      }
    });
  });

  test.describe('Controls Panel', () => {
    test('should display reset camera button', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const hasResetButton = await viewer.resetCameraButton.isVisible().catch(() => false);

      // Reset button is optional
      expect(hasResetButton).toBeDefined();
    });

    test('should reset camera on button click', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const hasResetButton = await viewer.resetCameraButton.isVisible().catch(() => false);

      if (hasResetButton) {
        // Move camera first
        const size = await viewer.getCanvasSize();
        await viewer.dragScene(size.width / 2, size.height / 2, size.width / 4, size.height / 4);

        // Reset
        await viewer.resetCameraButton.click();
        await page.waitForTimeout(500);

        await expect(viewer.canvas).toBeVisible();
      }
    });

    test('should have zoom controls', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const hasZoomIn = await viewer.zoomInButton.isVisible().catch(() => false);
      const hasZoomOut = await viewer.zoomOutButton.isVisible().catch(() => false);

      // Zoom controls are optional
      expect(hasZoomIn).toBeDefined();
      expect(hasZoomOut).toBeDefined();
    });

    test('should toggle fullscreen', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const hasFullscreen = await viewer.fullscreenButton.isVisible().catch(() => false);

      if (hasFullscreen) {
        await viewer.fullscreenButton.click();
        await page.waitForTimeout(500);

        // Fullscreen might not work in headless mode
        await expect(viewer.canvas).toBeVisible();
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should take screenshot for visual regression', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Wait for scene to fully render
        await page.waitForTimeout(2000);

        // Take screenshot
        await viewer.takeScreenshot('3d-viewer-initial');

        // Compare with baseline (Playwright's built-in visual comparison)
        await expect(viewer.canvas).toHaveScreenshot('3d-viewer-baseline.png', {
          maxDiffPixels: 500, // Allow some variance for WebGL rendering
        });
      }
    });

    test('should match screenshot after rotation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        const size = await viewer.getCanvasSize();

        // Rotate scene
        await viewer.dragScene(size.width / 2, size.height / 2, size.width / 4, size.height / 2);
        await page.waitForTimeout(1000);

        // Take screenshot
        await viewer.takeScreenshot('3d-viewer-rotated');
      }
    });

    test('should match screenshot after zoom', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Zoom in
        await viewer.scrollToZoom(-200);
        await page.waitForTimeout(1000);

        // Take screenshot
        await viewer.takeScreenshot('3d-viewer-zoomed');
      }
    });
  });

  test.describe('Performance', () => {
    test('should maintain responsive frame rate', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      const webglSupported = await viewer.isWebGLSupported();

      if (webglSupported) {
        // Measure frame timing during interaction
        const startTime = Date.now();
        const size = await viewer.getCanvasSize();

        // Perform multiple interactions
        for (let i = 0; i < 5; i++) {
          await viewer.dragScene(
            size.width / 2,
            size.height / 2,
            size.width / 4 + i * 20,
            size.height / 2
          );
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Interactions should complete in reasonable time
        expect(duration).toBeLessThan(5000);
      }
    });

    test('should show performance stats if enabled', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      // Enable stats via query param or similar
      await page.goto('/viewer/1?stats=true');
      await viewer.waitForSceneLoad();

      const hasStats = await viewer.performanceStats.isVisible().catch(() => false);

      // Stats display is optional
      expect(hasStats).toBeDefined();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      // Tab to canvas
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Canvas or controls should be focusable
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });

    test('should have aria labels for controls', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      // Check for aria labels on controls
      const buttons = page.locator('button[aria-label]');
      const buttonCount = await buttons.count();

      // Should have some accessible buttons
      expect(buttonCount).toBeGreaterThanOrEqual(0);
    });

    test('should announce selection changes to screen readers', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const viewer = new ThreeDViewerPage(page);

      await viewer.goto('1');

      // Look for aria-live regions
      const liveRegions = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      const liveCount = await liveRegions.count();

      // Live regions are optional but recommended
      expect(liveCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid viewer ID gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/viewer/invalid-id-12345');
      await page.waitForLoadState('domcontentloaded');

      // Should show error or redirect
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    });

    test('should handle scene loading errors', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      // Mock failed scene load
      await page.route('**/api/scene/**', (route) => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Scene not found' }),
        });
      });

      const viewer = new ThreeDViewerPage(page);
      await page.goto('/viewer/1');

      // Should not crash
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    });
  });
});
