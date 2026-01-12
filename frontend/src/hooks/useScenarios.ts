/**
 * Scenarios Hooks
 *
 * TanStack Query hooks for scenario CRUD operations.
 *
 * @module hooks/useScenarios
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { scenarioKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/client';
import type { Scenario, PaginatedResponse } from '@/types/api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated list of scenarios
 */
export function useScenarios(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  tags?: Record<string, string>;
}) {
  return useQuery<PaginatedResponse<Scenario>, Error>({
    queryKey: scenarioKeys.list(params),
    queryFn: () => api.scenarios.list(params),
    staleTime: STALE_TIMES.dynamic,
  });
}

/**
 * Fetch a single scenario by ID
 */
export function useScenario(scenarioId: string, options?: { enabled?: boolean }) {
  return useQuery<Scenario, Error>({
    queryKey: scenarioKeys.detail(scenarioId),
    queryFn: () => api.scenarios.get(scenarioId),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!scenarioId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new scenario
 */
export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Scenario, 'id'>) =>
      api.scenarios.create(data),
    onSuccess: () => {
      // Invalidate and refetch scenarios list
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
    },
  });
}

/**
 * Delete a scenario
 */
export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenarioId: string) => api.scenarios.delete(scenarioId),
    onSuccess: (_, scenarioId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: scenarioKeys.detail(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioKeys.lists() });
    },
  });
}

/**
 * Run evaluation on a scenario
 */
export function useRunEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scenarioId, metrics = ['accuracy', 'calibration'] }: { scenarioId: string; metrics?: string[] }) =>
      api.evaluation.run(scenarioId, metrics),
    onSuccess: (_, { scenarioId }) => {
      // Invalidate evaluation results
      queryClient.invalidateQueries({ queryKey: scenarioKeys.detail(scenarioId) });
    },
  });
}
