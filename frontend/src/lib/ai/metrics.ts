/**
 * AI Metrics Module
 *
 * Provides metrics collection, tracking, and reporting for AI operations.
 * Includes React context provider for application-wide metrics access.
 *
 * @module lib/ai/metrics
 */

import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { type ModelId, DEFAULT_MODEL, type CircuitBreakerState } from './config';

// ============================================================================
// Types
// ============================================================================

export interface AICallMetrics {
  id: string;
  model: ModelId;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  errorCode?: string;
  retryCount: number;
  fallbackUsed: boolean;
  fallbackModel?: ModelId;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata?: Record<string, unknown>;
}

export interface AggregatedMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokens: number;
  averageTokensPerCall: number;
  retryRate: number;
  fallbackRate: number;
  errorsByCode: Record<string, number>;
  callsByModel: Record<ModelId, number>;
  callsByOperation: Record<string, number>;
}

export interface MetricsSnapshot {
  timestamp: number;
  window: 'minute' | 'hour' | 'day';
  metrics: AggregatedMetrics;
}

export interface CircuitBreakerMetrics {
  model: ModelId;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastStateChange: number;
}

export interface MetricsContextValue {
  recordCall: (metrics: Omit<AICallMetrics, 'id'>) => string;
  updateCall: (id: string, updates: Partial<AICallMetrics>) => void;
  completeCall: (id: string, success: boolean, error?: Error) => void;
  getMetrics: () => AICallMetrics[];
  getAggregatedMetrics: (windowMs?: number) => AggregatedMetrics;
  getCircuitBreakerStatus: (model?: ModelId) => CircuitBreakerMetrics[];
  clearMetrics: () => void;
  exportMetrics: () => string;
}

// ============================================================================
// Metrics Store
// ============================================================================

class MetricsStore {
  private metrics: AICallMetrics[] = [];
  private circuitBreakers: Map<ModelId, CircuitBreakerMetrics> = new Map();
  private maxStoredMetrics: number = 10000;
  private listeners: Set<() => void> = new Set();

  /**
   * Records a new AI call and returns its ID.
   */
  recordCall(metrics: Omit<AICallMetrics, 'id'>): string {
    const id = this.generateId();
    const call: AICallMetrics = {
      ...metrics,
      id,
    };

    this.metrics.push(call);
    this.pruneOldMetrics();
    this.notifyListeners();

    return id;
  }

  /**
   * Updates an existing call's metrics.
   */
  updateCall(id: string, updates: Partial<AICallMetrics>): void {
    const index = this.metrics.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.metrics[index] = {
        ...this.metrics[index],
        ...updates,
      };
      this.notifyListeners();
    }
  }

  /**
   * Marks a call as complete with success/failure status.
   */
  completeCall(id: string, success: boolean, error?: Error): void {
    const index = this.metrics.findIndex((m) => m.id === id);
    if (index !== -1) {
      const endTime = Date.now();
      const call = this.metrics[index];
      this.metrics[index] = {
        ...call,
        endTime,
        duration: endTime - call.startTime,
        success,
        error: error?.message,
        errorCode: (error as { code?: string })?.code,
      };

      // Update circuit breaker metrics
      this.updateCircuitBreaker(call.model, success);
      this.notifyListeners();
    }
  }

  /**
   * Returns all stored metrics.
   */
  getMetrics(): AICallMetrics[] {
    return [...this.metrics];
  }

  /**
   * Returns aggregated metrics for a given time window.
   */
  getAggregatedMetrics(windowMs: number = 3600000): AggregatedMetrics {
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowedMetrics = this.metrics.filter((m) => m.startTime >= windowStart);

    const completedMetrics = windowedMetrics.filter((m) => m.endTime !== undefined);
    const successfulMetrics = completedMetrics.filter((m) => m.success);
    const failedMetrics = completedMetrics.filter((m) => !m.success);

    const durations = completedMetrics
      .map((m) => m.duration ?? 0)
      .sort((a, b) => a - b);

    const totalTokens = completedMetrics.reduce(
      (sum, m) => sum + (m.tokenUsage?.total ?? 0),
      0
    );

    const retriedCalls = completedMetrics.filter((m) => m.retryCount > 0);
    const fallbackCalls = completedMetrics.filter((m) => m.fallbackUsed);

    const errorsByCode: Record<string, number> = {};
    failedMetrics.forEach((m) => {
      const code = m.errorCode ?? 'UNKNOWN';
      errorsByCode[code] = (errorsByCode[code] ?? 0) + 1;
    });

    const callsByModel: Record<ModelId, number> = {} as Record<ModelId, number>;
    completedMetrics.forEach((m) => {
      callsByModel[m.model] = (callsByModel[m.model] ?? 0) + 1;
    });

    const callsByOperation: Record<string, number> = {};
    completedMetrics.forEach((m) => {
      callsByOperation[m.operation] = (callsByOperation[m.operation] ?? 0) + 1;
    });

    return {
      totalCalls: completedMetrics.length,
      successfulCalls: successfulMetrics.length,
      failedCalls: failedMetrics.length,
      successRate:
        completedMetrics.length > 0
          ? successfulMetrics.length / completedMetrics.length
          : 0,
      averageLatency:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p50Latency: this.percentile(durations, 50),
      p95Latency: this.percentile(durations, 95),
      p99Latency: this.percentile(durations, 99),
      totalTokens,
      averageTokensPerCall:
        completedMetrics.length > 0 ? totalTokens / completedMetrics.length : 0,
      retryRate:
        completedMetrics.length > 0
          ? retriedCalls.length / completedMetrics.length
          : 0,
      fallbackRate:
        completedMetrics.length > 0
          ? fallbackCalls.length / completedMetrics.length
          : 0,
      errorsByCode,
      callsByModel,
      callsByOperation,
    };
  }

  /**
   * Returns circuit breaker status for all models or a specific model.
   */
  getCircuitBreakerStatus(model?: ModelId): CircuitBreakerMetrics[] {
    if (model) {
      const status = this.circuitBreakers.get(model);
      return status ? [status] : [];
    }
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Clears all stored metrics.
   */
  clearMetrics(): void {
    this.metrics = [];
    this.notifyListeners();
  }

  /**
   * Exports metrics as JSON string.
   */
  exportMetrics(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      metrics: this.metrics,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      aggregated: this.getAggregatedMetrics(),
    }, null, 2);
  }

  /**
   * Subscribes to metrics changes.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] ?? 0;
  }

  private pruneOldMetrics(): void {
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }

  private updateCircuitBreaker(model: ModelId, success: boolean): void {
    const existing = this.circuitBreakers.get(model) ?? {
      model,
      state: 'CLOSED' as CircuitBreakerState,
      failureCount: 0,
      successCount: 0,
      lastStateChange: Date.now(),
    };

    const now = Date.now();

    if (success) {
      existing.successCount++;
      existing.lastSuccessTime = now;
      // Reset failure count on success in HALF_OPEN state
      if (existing.state === 'HALF_OPEN') {
        existing.failureCount = 0;
        existing.state = 'CLOSED';
        existing.lastStateChange = now;
      }
    } else {
      existing.failureCount++;
      existing.lastFailureTime = now;
      // Check if we should open the circuit
      if (existing.failureCount >= 5 && existing.state === 'CLOSED') {
        existing.state = 'OPEN';
        existing.lastStateChange = now;
      }
    }

    this.circuitBreakers.set(model, existing);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// ============================================================================
// Global Metrics Store Instance
// ============================================================================

const globalMetricsStore = new MetricsStore();

// ============================================================================
// React Context
// ============================================================================

const MetricsContext = createContext<MetricsContextValue | null>(null);

export interface MetricsProviderProps {
  children: React.ReactNode;
  store?: MetricsStore;
}

/**
 * Provider component for AI metrics context.
 * Wrap your application with this to enable metrics tracking.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <MetricsProvider>
 *       <YourApp />
 *     </MetricsProvider>
 *   );
 * }
 * ```
 */
export function MetricsProvider({
  children,
  store = globalMetricsStore,
}: MetricsProviderProps): React.ReactElement {
  const storeRef = useRef(store);

  const recordCall = useCallback(
    (metrics: Omit<AICallMetrics, 'id'>) => storeRef.current.recordCall(metrics),
    []
  );

  const updateCall = useCallback(
    (id: string, updates: Partial<AICallMetrics>) =>
      storeRef.current.updateCall(id, updates),
    []
  );

  const completeCall = useCallback(
    (id: string, success: boolean, error?: Error) =>
      storeRef.current.completeCall(id, success, error),
    []
  );

  const getMetrics = useCallback(() => storeRef.current.getMetrics(), []);

  const getAggregatedMetrics = useCallback(
    (windowMs?: number) => storeRef.current.getAggregatedMetrics(windowMs),
    []
  );

  const getCircuitBreakerStatus = useCallback(
    (model?: ModelId) => storeRef.current.getCircuitBreakerStatus(model),
    []
  );

  const clearMetrics = useCallback(() => storeRef.current.clearMetrics(), []);

  const exportMetrics = useCallback(() => storeRef.current.exportMetrics(), []);

  const value = useMemo<MetricsContextValue>(
    () => ({
      recordCall,
      updateCall,
      completeCall,
      getMetrics,
      getAggregatedMetrics,
      getCircuitBreakerStatus,
      clearMetrics,
      exportMetrics,
    }),
    [
      recordCall,
      updateCall,
      completeCall,
      getMetrics,
      getAggregatedMetrics,
      getCircuitBreakerStatus,
      clearMetrics,
      exportMetrics,
    ]
  );

  return React.createElement(MetricsContext.Provider, { value }, children);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access the metrics context.
 * Must be used within a MetricsProvider.
 */
export function useMetrics(): MetricsContextValue {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}

/**
 * Hook to get aggregated metrics with automatic updates.
 */
export function useAggregatedMetrics(windowMs: number = 3600000): AggregatedMetrics {
  const { getAggregatedMetrics } = useMetrics();
  const [metrics, setMetrics] = React.useState<AggregatedMetrics>(() =>
    getAggregatedMetrics(windowMs)
  );

  React.useEffect(() => {
    const unsubscribe = globalMetricsStore.subscribe(() => {
      setMetrics(getAggregatedMetrics(windowMs));
    });
    return unsubscribe;
  }, [getAggregatedMetrics, windowMs]);

  return metrics;
}

/**
 * Hook to track an AI call with automatic metrics recording.
 */
export function useTrackedCall(operation: string, model: ModelId = DEFAULT_MODEL) {
  const { recordCall, completeCall, updateCall } = useMetrics();
  const callIdRef = useRef<string | null>(null);

  const startCall = useCallback(
    (metadata?: Record<string, unknown>) => {
      callIdRef.current = recordCall({
        model,
        operation,
        startTime: Date.now(),
        success: false,
        retryCount: 0,
        fallbackUsed: false,
        metadata,
      });
      return callIdRef.current;
    },
    [recordCall, model, operation]
  );

  const endCall = useCallback(
    (success: boolean, error?: Error, tokenUsage?: AICallMetrics['tokenUsage']) => {
      if (callIdRef.current) {
        if (tokenUsage) {
          updateCall(callIdRef.current, { tokenUsage });
        }
        completeCall(callIdRef.current, success, error);
        callIdRef.current = null;
      }
    },
    [completeCall, updateCall]
  );

  const recordRetry = useCallback(() => {
    if (callIdRef.current) {
      const metrics = globalMetricsStore.getMetrics();
      const call = metrics.find((m) => m.id === callIdRef.current);
      if (call) {
        updateCall(callIdRef.current, { retryCount: call.retryCount + 1 });
      }
    }
  }, [updateCall]);

  const recordFallback = useCallback(
    (fallbackModel: ModelId) => {
      if (callIdRef.current) {
        updateCall(callIdRef.current, {
          fallbackUsed: true,
          fallbackModel,
        });
      }
    },
    [updateCall]
  );

  return {
    startCall,
    endCall,
    recordRetry,
    recordFallback,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a wrapper function that automatically tracks metrics.
 */
export function withMetricsTracking<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  operation: string,
  model: ModelId = DEFAULT_MODEL
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const callId = globalMetricsStore.recordCall({
      model,
      operation,
      startTime: Date.now(),
      success: false,
      retryCount: 0,
      fallbackUsed: false,
    });

    try {
      const result = await fn(...args);
      globalMetricsStore.completeCall(callId, true);
      return result;
    } catch (error) {
      globalMetricsStore.completeCall(
        callId,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  };
}

/**
 * Formats metrics for display.
 */
export function formatMetrics(metrics: AggregatedMetrics): string {
  return `
AI Metrics Summary
==================
Total Calls: ${metrics.totalCalls}
Success Rate: ${(metrics.successRate * 100).toFixed(1)}%
Average Latency: ${metrics.averageLatency.toFixed(0)}ms
P95 Latency: ${metrics.p95Latency.toFixed(0)}ms
Retry Rate: ${(metrics.retryRate * 100).toFixed(1)}%
Fallback Rate: ${(metrics.fallbackRate * 100).toFixed(1)}%
Total Tokens: ${metrics.totalTokens.toLocaleString()}
`.trim();
}

// ============================================================================
// Exports
// ============================================================================

export { globalMetricsStore, MetricsStore };
