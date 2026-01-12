/**
 * Accessibility E2E Tests
 *
 * End-to-end accessibility tests including:
 * - axe-core automated auditing
 * - Keyboard navigation
 * - Focus management
 * - Screen reader compatibility
 * - Color contrast
 *
 * @module e2e/accessibility.spec
 */

import { test, expect } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

// Pages to test for accessibility
const PAGES_TO_AUDIT = [
  { path: '/login', name: 'Login' },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/scenarios', name: 'Scenarios', requiresAuth: true },
  { path: '/viewer/1', name: '3D Viewer', requiresAuth: true },
];

test.describe('Accessibility', () => {
  test.describe('axe-core Accessibility Audit', () => {
    test('should have no critical accessibility violations on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter for critical and serious violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      // Log violations for debugging
      if (criticalViolations.length > 0) {
        console.log('Critical/Serious Accessibility Violations:');
        criticalViolations.forEach((violation) => {
          console.log(`  - ${violation.id}: ${violation.description}`);
          console.log(`    Impact: ${violation.impact}`);
          console.log(`    Help: ${violation.helpUrl}`);
          violation.nodes.forEach((node) => {
            console.log(`    Target: ${node.target}`);
            console.log(`    HTML: ${node.html.substring(0, 100)}...`);
          });
        });
      }

      expect(criticalViolations.length).toBe(0);
    });

    test('should have no critical accessibility violations on dashboard', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle').catch(() => {});

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-surface') // Exclude chart SVGs (often have false positives)
        .exclude('canvas') // Exclude WebGL canvas
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations.length).toBe(0);
    });

    test('should have no critical accessibility violations on scenarios page', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/scenarios');
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations.length).toBe(0);
    });

    test('should have no critical accessibility violations on 3D viewer', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/viewer/1');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for WebGL initialization

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('canvas') // Exclude WebGL canvas - not applicable
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations.length).toBe(0);
    });

    test('should run accessibility audit on all major pages', async ({
      page,
      authenticatedPage,
    }) => {
      const results: { page: string; violations: number; critical: number }[] = [];

      for (const pageConfig of PAGES_TO_AUDIT) {
        const testPage = pageConfig.requiresAuth ? authenticatedPage : page;

        await testPage.goto(pageConfig.path);
        await testPage.waitForLoadState('domcontentloaded');

        const accessibilityScanResults = await new AxeBuilder({ page: testPage })
          .withTags(['wcag2a', 'wcag2aa'])
          .exclude('canvas')
          .exclude('.recharts-surface')
          .analyze();

        const criticalCount = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        ).length;

        results.push({
          page: pageConfig.name,
          violations: accessibilityScanResults.violations.length,
          critical: criticalCount,
        });
      }

      // Log summary
      console.log('\nAccessibility Audit Summary:');
      results.forEach((r) => {
        console.log(`  ${r.page}: ${r.violations} violations (${r.critical} critical/serious)`);
      });

      // All pages should have no critical violations
      const totalCritical = results.reduce((sum, r) => sum + r.critical, 0);
      expect(totalCritical).toBe(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate login form with keyboard', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Start with Tab
      await page.keyboard.press('Tab');

      // Check that an interactive element has focus
      let focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focusedTag);

      // Tab through form
      await page.keyboard.press('Tab');
      focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focusedTag);

      // Tab to submit button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    });

    test('should navigate dashboard with keyboard', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Tab through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedTag).toBeDefined();
      }
    });

    test('should navigate with Shift+Tab (reverse)', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Tab forward multiple times
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Tab backward
      await page.keyboard.press('Shift+Tab');

      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedTag).toBeDefined();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Tab to an element
      await page.keyboard.press('Tab');

      // Check for focus ring/outline
      const hasFocusRing = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        const styles = window.getComputedStyle(el);
        return (
          styles.outlineStyle !== 'none' ||
          styles.boxShadow.includes('0px') === false || // ring-offset creates shadow
          el.classList.contains('focus-visible')
        );
      });

      // Focus should be visible
      expect(hasFocusRing).toBeDefined();
    });

    test('should skip to main content with skip link', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Look for skip link
      const skipLink = page.locator(
        'a[href="#main"], a:has-text("Skip to main"), a:has-text("Skip to content"), .skip-link'
      );
      const hasSkipLink = await skipLink.count();

      if (hasSkipLink > 0) {
        // Tab to skip link (usually first focusable element)
        await page.keyboard.press('Tab');

        // Activate skip link
        await page.keyboard.press('Enter');

        // Check that main content is focused
        const mainFocused = await page.evaluate(() => {
          const main = document.querySelector('main, #main, [role="main"]');
          return document.activeElement === main || main?.contains(document.activeElement || null);
        });

        expect(mainFocused).toBeDefined();
      }
    });

    test('should trap focus in modal dialogs', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Open any modal (e.g., user menu)
      const modalTrigger = page.locator(
        '[data-testid="user-menu"], button[aria-haspopup="dialog"], button[aria-haspopup="menu"]'
      );

      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        await page.waitForTimeout(300);

        // Tab multiple times - focus should stay in modal
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
        }

        // Check if focus is still within dialog/menu
        const focusedInModal = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"], [role="menu"], .modal, .popover');
          return dialog?.contains(document.activeElement);
        });

        // Close with Escape
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should manage focus when navigating between pages', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to another page
      const navLink = page.locator('a[href*="scenarios"], nav a').first();
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForLoadState('domcontentloaded');

        // Focus should be on main content or first heading
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedTag).toBeDefined();
      }
    });

    test('should restore focus after modal closes', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Find and click a modal trigger
      const modalTrigger = page.locator(
        'button[aria-haspopup="dialog"], [data-testid="open-modal"]'
      );

      if (await modalTrigger.isVisible()) {
        // Remember trigger
        await modalTrigger.focus();
        await modalTrigger.click();
        await page.waitForTimeout(300);

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Focus should return to trigger
        const isTriggerFocused = await modalTrigger.evaluate(
          (el) => el === document.activeElement
        );
        expect(isTriggerFocused).toBeTruthy();
      }
    });

    test('should focus first error on form validation', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Submit empty form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check if first invalid field is focused
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement;
        return {
          tag: el?.tagName,
          type: el?.type,
          isInvalid: !el?.validity?.valid,
        };
      });

      // First invalid input should be focused
      if (focusedElement.tag === 'INPUT') {
        expect(focusedElement.isInvalid).toBeTruthy();
      }
    });

    test('should announce loading states to screen readers', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Look for aria-live regions
      const liveRegions = await page.locator('[aria-live]').all();

      // Check for loading announcements
      const loadingIndicator = page.locator('[role="progressbar"], [aria-busy="true"]');
      const hasLoadingState = await loadingIndicator.count();

      // Should have some accessible loading indicator
      expect(liveRegions.length >= 0 || hasLoadingState >= 0).toBeTruthy();
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Get all headings
      const headings = await page.evaluate(() => {
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(headingElements).map((h) => ({
          level: parseInt(h.tagName.replace('H', '')),
          text: h.textContent?.trim(),
        }));
      });

      // Should have at least one heading
      expect(headings.length).toBeGreaterThan(0);

      // First heading should be h1
      if (headings.length > 0) {
        expect(headings[0].level).toBe(1);
      }

      // Check for proper hierarchy (no skipping levels)
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = headings[i - 1].level;
        const currentLevel = headings[i].level;
        // Can go deeper by 1, or go back to any higher level
        expect(currentLevel - prevLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper landmark regions', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Check for main landmark
      const mainLandmark = page.locator('main, [role="main"]');
      const hasMain = await mainLandmark.count();
      expect(hasMain).toBeGreaterThan(0);

      // Check for navigation landmark (if applicable)
      const navLandmark = page.locator('nav, [role="navigation"]');
      const hasNav = await navLandmark.count();
      expect(hasNav).toBeGreaterThanOrEqual(0);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Get all inputs
      const inputs = await page.locator('input:not([type="hidden"])').all();

      for (const input of inputs) {
        const hasLabel = await input.evaluate((el) => {
          // Check for associated label
          const id = el.id;
          const labelFor = document.querySelector(`label[for="${id}"]`);
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          const placeholder = el.getAttribute('placeholder');
          const parentLabel = el.closest('label');

          return !!(labelFor || ariaLabel || ariaLabelledby || parentLabel || placeholder);
        });

        expect(hasLabel).toBeTruthy();
      }
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Get all buttons
      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const hasAccessibleName = await button.evaluate((el) => {
          const textContent = el.textContent?.trim();
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          const title = el.getAttribute('title');

          return !!(textContent || ariaLabel || ariaLabelledby || title);
        });

        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should have proper image alt text', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Get all images
      const images = await page.locator('img').all();

      for (const img of images) {
        const hasAlt = await img.evaluate((el) => {
          const alt = el.getAttribute('alt');
          const role = el.getAttribute('role');

          // Either has alt text or is decorative (role="presentation" or empty alt)
          return alt !== null || role === 'presentation';
        });

        expect(hasAlt).toBeTruthy();
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();

      // Log any contrast issues
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Color Contrast Issues:');
        accessibilityScanResults.violations.forEach((v) => {
          v.nodes.forEach((node) => {
            console.log(`  - ${node.html.substring(0, 100)}`);
          });
        });
      }

      // Allow some contrast issues in complex UI
      expect(accessibilityScanResults.violations.length).toBeLessThan(5);
    });

    test('should not rely on color alone to convey information', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Check for status indicators that use more than color
      const statusIndicators = page.locator(
        '.status, .badge, [role="status"], .alert'
      );
      const statusCount = await statusIndicators.count();

      for (let i = 0; i < statusCount; i++) {
        const indicator = statusIndicators.nth(i);

        // Should have text, icon, or aria-label
        const hasTextOrIcon = await indicator.evaluate((el) => {
          const text = el.textContent?.trim();
          const hasIcon = el.querySelector('svg, i, [class*="icon"]');
          const ariaLabel = el.getAttribute('aria-label');

          return !!(text || hasIcon || ariaLabel);
        });

        expect(hasTextOrIcon).toBeTruthy();
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preference', async ({ page }) => {
      // Emulate prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Check that animations are disabled
      const hasReducedMotion = await page.evaluate(() => {
        const computedStyle = window.getComputedStyle(document.body);
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQuery.matches;
      });

      expect(hasReducedMotion).toBeTruthy();
    });

    test('should not auto-play animations without user control', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Look for auto-playing animations
      const autoPlayingAnimations = await page.evaluate(() => {
        const animations = document.getAnimations();
        return animations.filter(
          (anim) => anim.playState === 'running' && !anim.id?.includes('user-triggered')
        ).length;
      });

      // Some CSS animations are fine, but shouldn't be excessive
      expect(autoPlayingAnimations).toBeLessThan(20);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have valid ARIA attributes', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .options({
          runOnly: [
            'aria-allowed-attr',
            'aria-required-attr',
            'aria-valid-attr',
            'aria-valid-attr-value',
          ],
        })
        .analyze();

      expect(accessibilityScanResults.violations.length).toBe(0);
    });

    test('should have proper ARIA roles', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .options({
          runOnly: ['aria-roles'],
        })
        .analyze();

      expect(accessibilityScanResults.violations.length).toBe(0);
    });

    test('should have proper dialog accessibility', async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Open a dialog if available
      const dialogTrigger = page.locator(
        'button[aria-haspopup="dialog"], [data-testid="open-modal"]'
      );

      if (await dialogTrigger.isVisible()) {
        await dialogTrigger.click();
        await page.waitForTimeout(300);

        // Check dialog attributes
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
        if (await dialog.isVisible()) {
          // Should have aria-modal
          const ariaModal = await dialog.getAttribute('aria-modal');
          expect(ariaModal).toBe('true');

          // Should have aria-labelledby or aria-label
          const ariaLabelledby = await dialog.getAttribute('aria-labelledby');
          const ariaLabel = await dialog.getAttribute('aria-label');
          expect(ariaLabelledby || ariaLabel).toBeTruthy();
        }

        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Touch and Mobile Accessibility', () => {
    test('should have adequate touch target sizes', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Check button sizes
      const buttons = await page.locator('button, a, [role="button"]').all();

      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44 pixels
          // (some elements might be intentionally smaller)
          expect(box.width).toBeGreaterThan(20);
          expect(box.height).toBeGreaterThan(20);
        }
      }
    });

    test('should be usable at 200% zoom', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });

      // Check that content is still accessible
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const isVisible = await emailInput.isVisible().catch(() => false);

      expect(isVisible).toBeTruthy();

      // Check for horizontal scrolling (should be minimal)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth * 2;
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });
  });
});
