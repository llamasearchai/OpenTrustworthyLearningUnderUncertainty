/**
 * AI Retry Utilities
 *
 * Provides retry logic with exponential backoff and jitter
 * for resilient AI API calls.
 *
 * @module lib/ai/retry
 */

import {
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateDelay,
} from './config';

// ============================================================================
// Types
// ============================================================================

export interface RetryOptions extends Partial<RetryConfig> {
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  signal?: AbortSignal;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  totalDelayMs: number;
}

export interface RetryError extends Error {
  attempts: number;
  lastError: Error;
  errors: Error[];
}

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Determines if an error is retryable based on its type and status code.
 *
 * @param error - The error to check
 * @param config - Optional retry configuration
 * @returns Whether the error is retryable
 */
export function isRetryableError(
  error: unknown,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (error === null || error === undefined) {
    return false;
  }

  // Check for abort errors - these should not be retried
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false;
  }

  // Check for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check for errors with status codes
  if (typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    return config.retryableStatusCodes.includes(statusCode);
  }

  // Check for errors with status property
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return config.retryableStatusCodes.includes(status);
  }

  // Check for errors with retryable flag
  if (typeof error === 'object' && 'retryable' in error) {
    return Boolean((error as { retryable: boolean }).retryable);
  }

  // Check for specific error codes that indicate transient failures
  if (error instanceof Error) {
    const transientErrorPatterns = [
      /timeout/i,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /socket hang up/i,
      /network/i,
      /rate limit/i,
      /too many requests/i,
      /service unavailable/i,
      /internal server error/i,
      /bad gateway/i,
      /gateway timeout/i,
    ];

    return transientErrorPatterns.some((pattern) => pattern.test(error.message));
  }

  return false;
}

/**
 * Determines if an HTTP status code indicates a retryable error.
 *
 * @param statusCode - The HTTP status code
 * @param config - Optional retry configuration
 * @returns Whether the status code indicates a retryable error
 */
export function isRetryableStatusCode(
  statusCode: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return config.retryableStatusCodes.includes(statusCode);
}

// ============================================================================
// Delay Calculation
// ============================================================================

/**
 * Calculates the delay before the next retry attempt with exponential backoff and jitter.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns The delay in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  return calculateDelay(attempt, config);
}

/**
 * Calculates delay with full jitter strategy (Amazon-style).
 * This provides better distribution of retries across time.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns The delay in milliseconds
 */
export function calculateFullJitterDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
  return Math.random() * cappedDelay;
}

/**
 * Calculates delay with decorrelated jitter strategy.
 * Each retry is based on the previous delay, not the attempt number.
 *
 * @param previousDelay - The previous delay value
 * @param config - Retry configuration
 * @returns The delay in milliseconds
 */
export function calculateDecorrelatedJitterDelay(
  previousDelay: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const minDelay = config.initialDelayMs;
  const maxDelay = Math.min(config.maxDelayMs, previousDelay * 3);
  return minDelay + Math.random() * (maxDelay - minDelay);
}

// ============================================================================
// Core Retry Function
// ============================================================================

/**
 * Executes an async function with retry logic, exponential backoff, and jitter.
 *
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns A promise that resolves with the result or rejects after all retries
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/ai/complete');
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`),
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options,
  };

  const { onRetry, shouldRetry, signal } = options;
  const errors: Error[] = [];
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Check if aborted
    if (signal?.aborted) {
      const abortError = new Error('Retry aborted') as RetryError;
      abortError.name = 'AbortError';
      abortError.attempts = attempt;
      abortError.lastError = errors[errors.length - 1] ?? new Error('Aborted before first attempt');
      abortError.errors = errors;
      throw abortError;
    }

    try {
      const data = await fn();
      return {
        data,
        attempts: attempt + 1,
        totalDelayMs,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      // Check if we should retry
      const customShouldRetry = shouldRetry?.(err, attempt) ?? true;
      const isRetryable = isRetryableError(err, config);

      if (attempt >= config.maxRetries || !isRetryable || !customShouldRetry) {
        const retryError = new Error(
          `Failed after ${attempt + 1} attempts: ${err.message}`
        ) as RetryError;
        retryError.name = 'RetryError';
        retryError.attempts = attempt + 1;
        retryError.lastError = err;
        retryError.errors = errors;
        throw retryError;
      }

      // Calculate delay
      const delay = calculateRetryDelay(attempt, config);
      totalDelayMs += delay;

      // Notify about retry
      onRetry?.(err, attempt + 1, delay);

      // Wait before retrying
      await sleep(delay, signal);
    }
  }

  // This should never be reached
  throw new Error('Unexpected end of retry loop');
}

// ============================================================================
// Specialized Retry Functions
// ============================================================================

/**
 * Retry with immediate first attempt (no initial delay).
 * Useful for cases where the first failure might be a transient issue.
 */
export async function withImmediateRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(fn, {
    ...options,
    initialDelayMs: 0,
  });
}

/**
 * Retry with a constant delay between attempts (no exponential backoff).
 */
export async function withConstantRetry<T>(
  fn: () => Promise<T>,
  delayMs: number,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(fn, {
    ...options,
    initialDelayMs: delayMs,
    backoffMultiplier: 1,
    maxDelayMs: delayMs,
  });
}

/**
 * Retry with a timeout for the entire operation.
 */
export async function withTimeoutRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await withRetry(fn, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for a specified duration with optional abort signal.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Sleep aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Sleep aborted', 'AbortError'));
    });
  });
}

/**
 * Creates a retry-wrapped version of an async function.
 */
export function withRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TResult>> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}

/**
 * Creates a function that retries on specific error types.
 */
export function retryOn<T>(
  fn: () => Promise<T>,
  errorTypes: (new (...args: unknown[]) => Error)[],
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(fn, {
    ...options,
    shouldRetry: (error) => errorTypes.some((ErrorType) => error instanceof ErrorType),
  });
}
