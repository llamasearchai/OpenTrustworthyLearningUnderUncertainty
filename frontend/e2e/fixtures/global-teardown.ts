/**
 * Global Teardown for Playwright E2E Tests
 *
 * This file runs once after all tests to clean up:
 * - Temporary files
 * - Test data
 * - Authentication state (optional)
 *
 * @module e2e/fixtures/global-teardown
 */

import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state file paths
const STORAGE_STATE_DIR = path.join(__dirname, '../../playwright/.auth');

/**
 * Global teardown function
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('\n--- Running Global Teardown ---\n');

  // Clean up storage state files (optional - keep for faster subsequent runs)
  const cleanupStorageState = process.env.CLEANUP_AUTH === 'true';

  if (cleanupStorageState && fs.existsSync(STORAGE_STATE_DIR)) {
    try {
      fs.rmSync(STORAGE_STATE_DIR, { recursive: true });
      console.log('Cleaned up authentication storage state');
    } catch (error) {
      console.warn('Failed to clean up storage state:', error);
    }
  }

  // Clean up old test artifacts (keep only recent ones)
  const cleanupArtifacts = process.env.CLEANUP_ARTIFACTS === 'true';

  if (cleanupArtifacts) {
    await cleanupOldArtifacts();
  }

  // Perform any additional cleanup
  await performAdditionalCleanup();

  console.log('\n--- Global Teardown Complete ---\n');
}

/**
 * Clean up old test artifacts to save disk space
 */
async function cleanupOldArtifacts(): Promise<void> {
  const artifactsDir = path.join(__dirname, '../../playwright-results');
  const maxAgeInDays = 7;
  const maxAgeMs = maxAgeInDays * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(artifactsDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(artifactsDir, { withFileTypes: true });
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(artifactsDir, file.name);

      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAgeMs) {
          if (file.isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
          } else {
            fs.unlinkSync(filePath);
          }
          cleanedCount++;
        }
      } catch (error) {
        // Ignore errors for individual files
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old artifact(s)`);
    }
  } catch (error) {
    console.warn('Failed to clean up old artifacts:', error);
  }
}

/**
 * Perform any additional cleanup tasks
 */
async function performAdditionalCleanup(): Promise<void> {
  // Add any additional cleanup here
  // For example:
  // - Clean up test database entries
  // - Reset feature flags
  // - Clear test caches

  // Clean up any temporary download files
  const downloadsDir = path.join(__dirname, '../../playwright-results/downloads');

  if (fs.existsSync(downloadsDir)) {
    try {
      const files = fs.readdirSync(downloadsDir);
      const cleanupDownloads = process.env.CLEANUP_DOWNLOADS === 'true';

      if (cleanupDownloads) {
        for (const file of files) {
          const filePath = path.join(downloadsDir, file);
          fs.unlinkSync(filePath);
        }
        console.log(`Cleaned up ${files.length} download file(s)`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  console.log('Additional cleanup complete');
}

export default globalTeardown;
