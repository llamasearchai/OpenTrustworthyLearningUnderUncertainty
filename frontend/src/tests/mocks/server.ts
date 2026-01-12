/**
 * MSW Server Setup for Node.js (Tests)
 *
 * Configures Mock Service Worker for use in Vitest tests.
 * This file sets up the server with all handlers and provides
 * utilities for customizing handler behavior in tests.
 *
 * @module tests/mocks/server
 */

import { setupServer } from 'msw/node';
import { handlers, allHandlers } from './handlers';

// ============================================================================
// Server Setup
// ============================================================================

/**
 * MSW server instance configured with default handlers.
 * Use server.use() to add runtime handlers for specific tests.
 */
export const server = setupServer(...handlers);

// ============================================================================
// Server Utilities
// ============================================================================

/**
 * Resets handlers to the default set.
 * Call this in afterEach() to ensure test isolation.
 */
export function resetHandlers(): void {
  server.resetHandlers();
}

/**
 * Adds handlers that include error scenarios.
 * Useful for testing error handling.
 */
export function useAllHandlers(): void {
  server.resetHandlers(...allHandlers);
}

/**
 * Adds custom handlers for a specific test.
 * These handlers take precedence over default handlers.
 */
export function useHandlers(...customHandlers: Parameters<typeof server.use>): void {
  server.use(...customHandlers);
}

/**
 * Closes the server.
 * Call this in afterAll() to clean up.
 */
export function closeServer(): void {
  server.close();
}

/**
 * Starts the server with specified options.
 * Call this in beforeAll().
 */
export function startServer(options?: Parameters<typeof server.listen>[0]): void {
  server.listen(options ?? { onUnhandledRequest: 'error' });
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a test context with controlled server lifecycle.
 * Useful for integration tests.
 */
export function createServerTestContext() {
  return {
    beforeAll: () => startServer(),
    afterEach: () => resetHandlers(),
    afterAll: () => closeServer(),
    use: useHandlers,
    reset: resetHandlers,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { handlers, allHandlers };

export default server;
