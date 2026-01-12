/**
 * MSW Browser Setup for Storybook
 *
 * Configures Mock Service Worker for use in browser environments,
 * primarily for Storybook stories and development.
 *
 * @module tests/mocks/browser
 */

import { setupWorker } from 'msw/browser';
import { handlers, allHandlers } from './handlers';

// ============================================================================
// Worker Setup
// ============================================================================

/**
 * MSW worker instance configured with default handlers.
 * Use worker.use() to add runtime handlers for specific stories.
 */
export const worker = setupWorker(...handlers);

// ============================================================================
// Worker Utilities
// ============================================================================

/**
 * Resets handlers to the default set.
 */
export function resetHandlers(): void {
  worker.resetHandlers();
}

/**
 * Adds handlers that include error scenarios.
 */
export function useAllHandlers(): void {
  worker.resetHandlers(...allHandlers);
}

/**
 * Adds custom handlers for a specific story.
 * These handlers take precedence over default handlers.
 */
export function useHandlers(...customHandlers: Parameters<typeof worker.use>): void {
  worker.use(...customHandlers);
}

/**
 * Stops the worker.
 */
export function stopWorker(): void {
  worker.stop();
}

/**
 * Starts the worker with specified options.
 */
export async function startWorker(
  options?: Parameters<typeof worker.start>[0]
): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    ...options,
  });
}

// ============================================================================
// Storybook Integration
// ============================================================================

/**
 * Initialize MSW for Storybook.
 * Call this in .storybook/preview.tsx before rendering stories.
 *
 * @example
 * ```typescript
 * // .storybook/preview.tsx
 * import { initializeMSW } from '../src/tests/mocks/browser';
 *
 * initializeMSW();
 *
 * export const decorators = [...];
 * ```
 */
export async function initializeMSW(): Promise<void> {
  if (typeof window !== 'undefined') {
    await startWorker();
    console.log('[MSW] Mock Service Worker started');
  }
}

/**
 * Creates MSW handlers for a specific story.
 * Use this in story parameters to customize API behavior.
 *
 * @example
 * ```typescript
 * export const ErrorState: Story = {
 *   parameters: {
 *     msw: {
 *       handlers: createStoryHandlers([
 *         http.get('/api/data', () => HttpResponse.json({ error: 'Not found' }, { status: 404 })),
 *       ]),
 *     },
 *   },
 * };
 * ```
 */
export function createStoryHandlers(customHandlers: Parameters<typeof worker.use>) {
  return [...handlers, ...customHandlers];
}

/**
 * Storybook decorator that applies MSW handlers from story parameters.
 * Add this to your Storybook decorators.
 *
 * @example
 * ```typescript
 * // .storybook/preview.tsx
 * import { mswDecorator } from '../src/tests/mocks/browser';
 *
 * export const decorators = [mswDecorator];
 * ```
 */
export function mswDecorator(
  Story: React.ComponentType,
  context: { parameters?: { msw?: { handlers?: unknown[] } } }
) {
  const { parameters } = context;

  // Reset handlers before each story
  resetHandlers();

  // Apply story-specific handlers if provided
  if (parameters?.msw?.handlers) {
    worker.use(...(parameters.msw.handlers as Parameters<typeof worker.use>));
  }

  return Story;
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Logs all registered handlers to console.
 * Useful for debugging.
 */
export function logHandlers(): void {
  console.log('[MSW] Registered handlers:', handlers.length);
  handlers.forEach((handler) => {
    console.log(`  - ${handler.info.method} ${handler.info.path}`);
  });
}

/**
 * Checks if MSW is active.
 */
export function isMSWActive(): boolean {
  return typeof window !== 'undefined' && !!worker;
}

// ============================================================================
// Exports
// ============================================================================

export { handlers, allHandlers };

export default worker;
