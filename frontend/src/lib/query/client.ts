/**
 * TanStack Query Client Configuration
 *
 * Configures the query client with optimized defaults for the OpenTLU dashboard.
 *
 * @module lib/query/client
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { ApiClientError } from '@/lib/api/client';

// ============================================================================
// Stale Time Configuration
// ============================================================================

/**
 * Stale times for different data categories (in milliseconds)
 */
export const STALE_TIMES = {
  /** Static configuration data - rarely changes */
  static: 5 * 60 * 1000, // 5 minutes
  /** Dynamic operational data - frequently updated */
  dynamic: 30 * 1000, // 30 seconds
  /** Real-time data - always fresh */
  realtime: 0,
  /** User preferences - moderate update frequency */
  preferences: 2 * 60 * 1000, // 2 minutes
} as const;

/**
 * Garbage collection time (how long to keep unused data in cache)
 */
export const GC_TIME = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Default retry logic for failed queries
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry if we've exceeded max retries
  if (failureCount >= 3) return false;

  // Check if error is retryable
  if (error instanceof ApiClientError) {
    return error.isRetryable;
  }

  // Retry network errors
  if (error instanceof Error && error.name === 'NetworkError') {
    return true;
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
}

// ============================================================================
// Default Options
// ============================================================================

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: STALE_TIMES.dynamic,
    gcTime: GC_TIME,
    retry: shouldRetry,
    retryDelay: getRetryDelay,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
  },
};

// ============================================================================
// Query Client Instance
// ============================================================================

/**
 * Create a new QueryClient instance
 * Used for both app and test contexts
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
  });
}

/**
 * Singleton query client for the application
 */
export const queryClient = createQueryClient();

// ============================================================================
// Query Client Utilities
// ============================================================================

/**
 * Prefetch common data on app initialization
 */
export async function prefetchCriticalData(): Promise<void> {
  // Import here to avoid circular dependencies
  const { api } = await import('@/lib/api/client');
  const { safetyKeys, activeLearningKeys } = await import('./keys');

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: safetyKeys.mitigationState(),
      queryFn: () => api.safety.getMitigationState(),
      staleTime: STALE_TIMES.dynamic,
    }),
    queryClient.prefetchQuery({
      queryKey: activeLearningKeys.acquisitionConfig(),
      queryFn: () => api.activeLearning.getAcquisitionConfig(),
      staleTime: STALE_TIMES.static,
    }),
  ]);
}

/**
 * Clear all cached data (useful for logout)
 */
export function clearQueryCache(): void {
  queryClient.clear();
}

/**
 * Invalidate all queries (trigger refetch)
 */
export async function invalidateAllQueries(): Promise<void> {
  await queryClient.invalidateQueries();
}
