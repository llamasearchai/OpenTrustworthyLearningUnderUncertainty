/**
 * Active Learning Hooks
 *
 * TanStack Query hooks for samples, batch selection, and acquisition.
 *
 * @module hooks/useActiveLearning
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { activeLearningKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/client';
import type {
  SampleMetadata,
  AcquisitionConfig,
  BatchSelectionResult,
  PaginatedResponse,
} from '@/types/api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated samples for active learning
 */
export function useSamples(params?: {
  page?: number;
  pageSize?: number;
  sortBy?: 'uncertainty' | 'risk' | 'novelty';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery<PaginatedResponse<SampleMetadata>, Error>({
    queryKey: activeLearningKeys.samples(params),
    queryFn: () => api.activeLearning.getSamples(params),
    staleTime: STALE_TIMES.dynamic,
  });
}

/**
 * Fetch samples with infinite scrolling
 */
export function useSamplesInfinite(params?: {
  pageSize?: number;
  sortBy?: 'uncertainty' | 'risk' | 'novelty';
  sortOrder?: 'asc' | 'desc';
}) {
  return useInfiniteQuery<PaginatedResponse<SampleMetadata>, Error>({
    queryKey: activeLearningKeys.samples(params),
    queryFn: ({ pageParam = 1 }) =>
      api.activeLearning.getSamples({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: STALE_TIMES.dynamic,
  });
}

/**
 * Fetch acquisition configuration
 */
export function useAcquisitionConfig() {
  return useQuery<AcquisitionConfig, Error>({
    queryKey: activeLearningKeys.acquisitionConfig(),
    queryFn: () => api.activeLearning.getAcquisitionConfig(),
    staleTime: STALE_TIMES.static,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Select a batch of samples for labeling
 */
export function useBatchSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sampleIds,
      batchSize,
      config,
    }: {
      sampleIds: string[];
      batchSize: number;
      config?: AcquisitionConfig;
    }) => api.activeLearning.selectBatch(sampleIds, batchSize, config),
    onSuccess: (result) => {
      // Optionally cache the selection result
      queryClient.setQueryData(
        activeLearningKeys.batchSelection(Date.now().toString()),
        result
      );
    },
  });
}

/**
 * Update acquisition configuration
 */
export function useUpdateAcquisitionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<AcquisitionConfig>) =>
      api.activeLearning.updateAcquisitionConfig(config),
    onSuccess: (newConfig) => {
      queryClient.setQueryData(
        activeLearningKeys.acquisitionConfig(),
        newConfig
      );
    },
    // Optimistic update
    onMutate: async (config) => {
      await queryClient.cancelQueries({
        queryKey: activeLearningKeys.acquisitionConfig(),
      });

      const previous = queryClient.getQueryData<AcquisitionConfig>(
        activeLearningKeys.acquisitionConfig()
      );

      if (previous) {
        queryClient.setQueryData(activeLearningKeys.acquisitionConfig(), {
          ...previous,
          ...config,
        });
      }

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          activeLearningKeys.acquisitionConfig(),
          context.previous
        );
      }
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get samples ranked by a combined acquisition score
 */
export function useRankedSamples(topK: number = 10) {
  const { data: config } = useAcquisitionConfig();
  const { data: samplesData, ...rest } = useSamples({
    pageSize: topK * 2, // Fetch more to allow for diversity filtering
    sortBy: 'uncertainty',
    sortOrder: 'desc',
  });

  const rankedSamples = (() => {
    if (!samplesData?.items || !config) return [];

    // Calculate acquisition scores
    const scored = samplesData.items.map((sample) => {
      const uncertaintyScore =
        sample.uncertainty.aleatoric_score + sample.uncertainty.epistemic_score;
      const riskScore = sample.risk.expected_risk;
      const noveltyScore = sample.novelty_score;

      const totalScore =
        config.weight_uncertainty * uncertaintyScore +
        config.weight_risk * riskScore +
        config.weight_novelty * noveltyScore;

      return { ...sample, acquisitionScore: totalScore };
    });

    // Sort by score and take top K
    return scored
      .sort((a, b) => b.acquisitionScore - a.acquisitionScore)
      .slice(0, topK);
  })();

  return {
    ...rest,
    data: rankedSamples,
  };
}

/**
 * Get high-uncertainty samples (above threshold)
 */
export function useHighUncertaintySamples(threshold: number = 0.7) {
  const { data: samplesData, ...rest } = useSamples({
    sortBy: 'uncertainty',
    sortOrder: 'desc',
  });

  const highUncertaintySamples =
    samplesData?.items.filter((sample) => {
      const totalUncertainty =
        sample.uncertainty.aleatoric_score + sample.uncertainty.epistemic_score;
      return totalUncertainty >= threshold;
    }) ?? [];

  return {
    ...rest,
    data: highUncertaintySamples,
    count: highUncertaintySamples.length,
  };
}

/**
 * Get high-risk samples
 */
export function useHighRiskSamples(riskThreshold: number = 0.5) {
  const { data: samplesData, ...rest } = useSamples({
    sortBy: 'risk',
    sortOrder: 'desc',
  });

  const highRiskSamples =
    samplesData?.items.filter(
      (sample) => sample.risk.expected_risk >= riskThreshold
    ) ?? [];

  return {
    ...rest,
    data: highRiskSamples,
    count: highRiskSamples.length,
  };
}

/**
 * Batch selection with preview
 */
export function useBatchSelectionPreview(
  sampleIds: string[],
  batchSize: number,
  config?: AcquisitionConfig
) {
  const {
    mutateAsync: selectBatch,
    isPending,
    data: selection,
    error,
  } = useBatchSelection();

  const preview = async () => {
    if (sampleIds.length === 0) return null;
    return selectBatch({ sampleIds, batchSize, config });
  };

  return {
    preview,
    isPreviewing: isPending,
    previewResult: selection,
    error,
  };
}
