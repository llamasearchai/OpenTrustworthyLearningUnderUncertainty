/**
 * Uncertainty Estimation Hooks
 *
 * TanStack Query hooks for uncertainty data fetching and mutations.
 *
 * @module hooks/useUncertainty
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { uncertaintyKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/client';
import type {
  UncertaintyEstimate,
  TimeSeriesPoint,
  UncertaintyDecomposition,
  PaginatedResponse,
} from '@/types/api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch uncertainty estimate for a model
 */
export function useUncertaintyEstimate(
  modelId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery<UncertaintyEstimate, Error>({
    queryKey: uncertaintyKeys.detail(modelId),
    queryFn: () => api.uncertainty.getEstimate(modelId),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!modelId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Fetch uncertainty history time series
 */
export function useUncertaintyHistory(
  modelId: string,
  params?: {
    start?: number;
    end?: number;
    limit?: number;
  },
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery<PaginatedResponse<TimeSeriesPoint>, Error>({
    queryKey: uncertaintyKeys.history(modelId, params),
    queryFn: () => api.uncertainty.getHistory(modelId, params),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!modelId,
  });
}

/**
 * Get decomposed uncertainty (aleatoric/epistemic split)
 */
export function useUncertaintyDecomposition(
  modelId: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery<UncertaintyDecomposition, Error>({
    queryKey: uncertaintyKeys.decomposition(modelId),
    queryFn: async () => {
      // This would typically come from a specific endpoint
      const estimate = await api.uncertainty.getEstimate(modelId);
      return {
        total: estimate.aleatoric_score + estimate.epistemic_score,
        aleatoric: estimate.aleatoric_score,
        epistemic: estimate.epistemic_score,
        confidence: estimate.confidence,
        source: estimate.source,
      };
    },
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!modelId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Decompose ensemble predictions into uncertainty components
 */
export function useDecomposeUncertainty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ensembleProbs: number[][]) =>
      api.uncertainty.decompose(ensembleProbs),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: uncertaintyKeys.all });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get uncertainty level category based on thresholds
 */
export function useUncertaintyLevel(
  modelId: string,
  thresholds: { warning: number; critical: number } = { warning: 0.3, critical: 0.6 }
) {
  const { data: estimate, ...rest } = useUncertaintyEstimate(modelId);

  const level = (() => {
    if (!estimate) return 'unknown';
    const totalUncertainty = estimate.aleatoric_score + estimate.epistemic_score;
    if (totalUncertainty >= thresholds.critical) return 'critical';
    if (totalUncertainty >= thresholds.warning) return 'warning';
    return 'nominal';
  })();

  return {
    ...rest,
    data: estimate,
    level,
  };
}

/**
 * Subscribe to real-time uncertainty updates
 */
export function useUncertaintySubscription(
  modelId: string,
  onUpdate?: (estimate: UncertaintyEstimate) => void
) {
  const queryClient = useQueryClient();

  // This would integrate with the WebSocket client
  // For now, we use polling as a fallback
  const query = useUncertaintyEstimate(modelId, {
    refetchInterval: 5000, // Poll every 5 seconds
  });

  return query;
}
