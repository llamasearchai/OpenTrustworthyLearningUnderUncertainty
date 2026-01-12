/**
 * Evaluation Hooks
 *
 * TanStack Query hooks for scenarios, evaluations, and metrics.
 *
 * @module hooks/useEvaluation
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { evaluationKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/client';
import type {
  Scenario,
  EvaluationResult,
  AggregatedResults,
  PaginatedResponse,
} from '@/types/api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated list of scenarios
 */
export function useScenarios(params?: {
  page?: number;
  pageSize?: number;
  tags?: Record<string, string>;
}) {
  return useQuery<PaginatedResponse<Scenario>, Error>({
    queryKey: evaluationKeys.list(params ?? {}),
    queryFn: () => api.scenarios.list(params),
    staleTime: STALE_TIMES.static,
  });
}

/**
 * Fetch scenarios with infinite scrolling
 */
export function useScenariosInfinite(params?: {
  pageSize?: number;
  tags?: Record<string, string>;
}) {
  return useInfiniteQuery<PaginatedResponse<Scenario>, Error>({
    queryKey: evaluationKeys.lists(),
    queryFn: ({ pageParam = 1 }) =>
      api.scenarios.list({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: STALE_TIMES.static,
  });
}

/**
 * Fetch a single scenario by ID
 */
export function useScenario(id: string, options?: { enabled?: boolean }) {
  return useQuery<Scenario, Error>({
    queryKey: evaluationKeys.scenario(id),
    queryFn: () => api.scenarios.get(id),
    staleTime: STALE_TIMES.static,
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Fetch evaluation results for a scenario
 */
export function useEvaluationResults(
  scenarioId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<PaginatedResponse<EvaluationResult>, Error>({
    queryKey: evaluationKeys.results(scenarioId),
    queryFn: () => api.evaluation.getResults(scenarioId),
    staleTime: STALE_TIMES.dynamic,
    enabled: options?.enabled ?? !!scenarioId,
  });
}

/**
 * Fetch aggregated metrics across scenarios
 */
export function useAggregatedMetrics(scenarioIds?: string[]) {
  return useQuery<AggregatedResults, Error>({
    queryKey: evaluationKeys.aggregated(scenarioIds),
    queryFn: () => api.evaluation.aggregate(scenarioIds),
    staleTime: STALE_TIMES.dynamic,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Run evaluation on a scenario
 */
export function useRunEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scenarioId,
      metrics,
    }: {
      scenarioId: string;
      metrics: string[];
    }) => api.evaluation.run(scenarioId, metrics),
    onSuccess: (result, variables) => {
      // Invalidate evaluation results for this scenario
      queryClient.invalidateQueries({
        queryKey: evaluationKeys.results(variables.scenarioId),
      });
      // Invalidate aggregated metrics
      queryClient.invalidateQueries({
        queryKey: evaluationKeys.aggregated(),
      });
    },
  });
}

/**
 * Create a new scenario
 */
export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenario: Omit<Scenario, 'id'>) =>
      api.scenarios.create(scenario),
    onSuccess: (newScenario) => {
      // Add to cache
      queryClient.setQueryData(
        evaluationKeys.scenario(newScenario.id),
        newScenario
      );
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: evaluationKeys.lists() });
    },
  });
}

/**
 * Delete a scenario
 */
export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.scenarios.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: evaluationKeys.scenario(deletedId),
      });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: evaluationKeys.lists() });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get evaluation pass rate for a set of scenarios
 */
export function usePassRate(scenarioIds?: string[]) {
  const { data, ...rest } = useAggregatedMetrics(scenarioIds);

  return {
    ...rest,
    passRate: data?.pass_rate ?? null,
    totalScenarios: data?.total_scenarios ?? 0,
  };
}

/**
 * Search scenarios by tags
 */
export function useScenarioSearch(
  searchTags: Record<string, string>,
  options?: { enabled?: boolean }
) {
  return useScenarios({
    tags: searchTags,
  });
}
