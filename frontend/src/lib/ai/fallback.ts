/**
 * AI Fallback Utilities
 *
 * Provides fallback logic for graceful degradation when
 * primary AI models are unavailable.
 *
 * @module lib/ai/fallback
 */

import {
  type ModelId,
  type AIConfig,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  DEFAULT_AI_CONFIG,
  getNextFallbackModel,
} from './config';
import { withRetry, isRetryableError, type RetryOptions } from './retry';

// ============================================================================
// Types
// ============================================================================

export interface FallbackOptions<T> {
  models?: readonly ModelId[];
  onModelSwitch?: (fromModel: ModelId, toModel: ModelId, error: Error) => void;
  onAllFailed?: (errors: ModelError[]) => void;
  retryOptions?: RetryOptions;
  timeout?: number;
  signal?: AbortSignal;
}

export interface FallbackResult<T> {
  data: T;
  model: ModelId;
  attemptedModels: ModelId[];
  errors: ModelError[];
}

export interface ModelError {
  model: ModelId;
  error: Error;
  timestamp: number;
}

export interface FallbackChainConfig {
  primary: ModelId;
  fallbacks: readonly ModelId[];
  skipCondition?: (model: ModelId, previousErrors: ModelError[]) => boolean;
}

// ============================================================================
// Core Fallback Function
// ============================================================================

/**
 * Executes an async function with model fallback support.
 * If the primary model fails, it automatically tries fallback models in order.
 *
 * @param fn - The async function to execute, receives the current model as parameter
 * @param options - Fallback options
 * @returns A promise that resolves with the result or rejects after all models fail
 *
 * @example
 * ```typescript
 * const result = await withFallback(
 *   async (model) => {
 *     const response = await aiClient.complete({
 *       model,
 *       messages: [{ role: 'user', content: 'Hello' }],
 *     });
 *     return response;
 *   },
 *   {
 *     models: ['gpt-5.2', 'gpt-4.1', 'gpt-4.1-mini'],
 *     onModelSwitch: (from, to) => console.log(`Switching from ${from} to ${to}`),
 *   }
 * );
 * ```
 */
export async function withFallback<T>(
  fn: (model: ModelId) => Promise<T>,
  options: FallbackOptions<T> = {}
): Promise<FallbackResult<T>> {
  const {
    models = [DEFAULT_MODEL, ...FALLBACK_MODELS],
    onModelSwitch,
    onAllFailed,
    retryOptions = {},
    timeout,
    signal,
  } = options;

  const errors: ModelError[] = [];
  const attemptedModels: ModelId[] = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    attemptedModels.push(model);

    // Check if aborted
    if (signal?.aborted) {
      throw new FallbackError(
        'Fallback operation aborted',
        attemptedModels,
        errors
      );
    }

    try {
      // Create abort controller for timeout if specified
      const controller = timeout ? new AbortController() : undefined;
      const timeoutId = timeout
        ? setTimeout(() => controller?.abort(), timeout)
        : undefined;

      try {
        // Try the current model with retry logic
        const { data } = await withRetry(
          () => fn(model),
          {
            ...retryOptions,
            signal: signal ?? controller?.signal,
          }
        );

        return {
          data,
          model,
          attemptedModels,
          errors,
        };
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({
        model,
        error: err,
        timestamp: Date.now(),
      });

      // If there's a next model, notify about the switch
      const nextModel = models[i + 1];
      if (nextModel && onModelSwitch) {
        onModelSwitch(model, nextModel, err);
      }
    }
  }

  // All models failed
  onAllFailed?.(errors);

  throw new FallbackError(
    `All ${models.length} models failed`,
    attemptedModels,
    errors
  );
}

// ============================================================================
// Fallback Error
// ============================================================================

export class FallbackError extends Error {
  public readonly attemptedModels: ModelId[];
  public readonly errors: ModelError[];

  constructor(
    message: string,
    attemptedModels: ModelId[],
    errors: ModelError[]
  ) {
    super(message);
    this.name = 'FallbackError';
    this.attemptedModels = attemptedModels;
    this.errors = errors;
  }

  /**
   * Returns the last error that occurred.
   */
  get lastError(): Error | undefined {
    return this.errors[this.errors.length - 1]?.error;
  }

  /**
   * Returns a summary of all errors.
   */
  getSummary(): string {
    return this.errors
      .map((e) => `${e.model}: ${e.error.message}`)
      .join('\n');
  }
}

// ============================================================================
// Specialized Fallback Functions
// ============================================================================

/**
 * Fallback with priority-based model selection.
 * Models are tried in order of priority, with higher priority models retried more.
 */
export async function withPriorityFallback<T>(
  fn: (model: ModelId) => Promise<T>,
  priorityConfig: Map<ModelId, number>,
  options: Omit<FallbackOptions<T>, 'models'> = {}
): Promise<FallbackResult<T>> {
  // Sort models by priority (higher priority first)
  const sortedModels = Array.from(priorityConfig.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([model]) => model);

  return withFallback(fn, {
    ...options,
    models: sortedModels,
  });
}

/**
 * Fallback with health check before trying each model.
 */
export async function withHealthCheckFallback<T>(
  fn: (model: ModelId) => Promise<T>,
  healthCheck: (model: ModelId) => Promise<boolean>,
  options: FallbackOptions<T> = {}
): Promise<FallbackResult<T>> {
  const { models = [DEFAULT_MODEL, ...FALLBACK_MODELS], ...rest } = options;

  // Filter to only healthy models
  const healthyModels: ModelId[] = [];
  for (const model of models) {
    try {
      const isHealthy = await healthCheck(model);
      if (isHealthy) {
        healthyModels.push(model);
      }
    } catch {
      // Model health check failed, skip it
    }
  }

  if (healthyModels.length === 0) {
    throw new FallbackError(
      'No healthy models available',
      Array.from(models),
      []
    );
  }

  return withFallback(fn, {
    ...rest,
    models: healthyModels,
  });
}

/**
 * Fallback with cost-aware model selection.
 * Tries cheaper models first if the error indicates a non-critical issue.
 */
export async function withCostAwareFallback<T>(
  fn: (model: ModelId) => Promise<T>,
  costConfig: Map<ModelId, number>,
  options: FallbackOptions<T> = {}
): Promise<FallbackResult<T>> {
  const { models = [DEFAULT_MODEL, ...FALLBACK_MODELS], ...rest } = options;

  // First try normal order
  try {
    return await withFallback(fn, { ...rest, models });
  } catch (error) {
    if (!(error instanceof FallbackError)) throw error;

    // If all failed with non-retryable errors, try cheaper models
    const hasNonRetryable = error.errors.some(
      (e) => !isRetryableError(e.error)
    );

    if (hasNonRetryable) {
      // Sort by cost (cheaper first)
      const cheaperModels = Array.from(models)
        .filter((model) => costConfig.has(model))
        .sort((a, b) => (costConfig.get(a) ?? 0) - (costConfig.get(b) ?? 0));

      if (cheaperModels.length > 0) {
        return withFallback(fn, { ...rest, models: cheaperModels });
      }
    }

    throw error;
  }
}

// ============================================================================
// Fallback Chain Builder
// ============================================================================

/**
 * Builder class for creating complex fallback chains.
 */
export class FallbackChainBuilder<T> {
  private models: ModelId[] = [];
  private retryOptions: RetryOptions = {};
  private onModelSwitchHandler?: (from: ModelId, to: ModelId, error: Error) => void;
  private onAllFailedHandler?: (errors: ModelError[]) => void;
  private timeout?: number;

  /**
   * Adds a model to the fallback chain.
   */
  addModel(model: ModelId): this {
    this.models.push(model);
    return this;
  }

  /**
   * Adds multiple models to the fallback chain.
   */
  addModels(models: ModelId[]): this {
    this.models.push(...models);
    return this;
  }

  /**
   * Sets retry options for each model attempt.
   */
  withRetry(options: RetryOptions): this {
    this.retryOptions = options;
    return this;
  }

  /**
   * Sets a callback for when the chain switches models.
   */
  onSwitch(handler: (from: ModelId, to: ModelId, error: Error) => void): this {
    this.onModelSwitchHandler = handler;
    return this;
  }

  /**
   * Sets a callback for when all models fail.
   */
  onFailure(handler: (errors: ModelError[]) => void): this {
    this.onAllFailedHandler = handler;
    return this;
  }

  /**
   * Sets a timeout for each model attempt.
   */
  withTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  /**
   * Executes the fallback chain with the given function.
   */
  async execute(fn: (model: ModelId) => Promise<T>): Promise<FallbackResult<T>> {
    if (this.models.length === 0) {
      this.models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
    }

    return withFallback(fn, {
      models: this.models,
      retryOptions: this.retryOptions,
      onModelSwitch: this.onModelSwitchHandler,
      onAllFailed: this.onAllFailedHandler,
      timeout: this.timeout,
    });
  }
}

/**
 * Creates a new fallback chain builder.
 */
export function createFallbackChain<T>(): FallbackChainBuilder<T> {
  return new FallbackChainBuilder<T>();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets all models in the fallback chain starting from the given model.
 */
export function getFallbackChain(startingModel: ModelId = DEFAULT_MODEL): ModelId[] {
  const chain: ModelId[] = [startingModel];
  let current: ModelId | null = startingModel;

  while (current) {
    const next = getNextFallbackModel(current);
    if (next && !chain.includes(next)) {
      chain.push(next);
      current = next;
    } else {
      break;
    }
  }

  return chain;
}

/**
 * Checks if a model has fallbacks available.
 */
export function hasFallback(model: ModelId): boolean {
  return getNextFallbackModel(model) !== null;
}

/**
 * Creates a fallback-aware function wrapper.
 */
export function withFallbackWrapper<TArgs extends unknown[], TResult>(
  fn: (model: ModelId, ...args: TArgs) => Promise<TResult>,
  options: FallbackOptions<TResult> = {}
): (...args: TArgs) => Promise<FallbackResult<TResult>> {
  return (...args: TArgs) =>
    withFallback((model) => fn(model, ...args), options);
}
