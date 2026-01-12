/**
 * TanStack Query Key Factory
 *
 * Centralized query key management following the query key factory pattern
 * for consistent cache management and invalidation.
 *
 * @module lib/query/keys
 */

// ============================================================================
// Types
// ============================================================================

interface ListFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;
}

// ============================================================================
// Query Key Factories
// ============================================================================

/**
 * Query keys for scenario-related data
 */
export const scenarioKeys = {
  all: ['scenarios'] as const,
  lists: () => [...scenarioKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...scenarioKeys.lists(), filters] as const,
  details: () => [...scenarioKeys.all, 'detail'] as const,
  detail: (id: string) => [...scenarioKeys.details(), id] as const,
};

/**
 * Query keys for uncertainty-related data
 */
export const uncertaintyKeys = {
  all: ['uncertainty'] as const,
  lists: () => [...uncertaintyKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...uncertaintyKeys.lists(), filters] as const,
  details: () => [...uncertaintyKeys.all, 'detail'] as const,
  detail: (id: string) => [...uncertaintyKeys.details(), id] as const,
  history: (modelId: string, params?: { start?: number; end?: number }) =>
    [...uncertaintyKeys.all, 'history', modelId, params] as const,
  decomposition: (modelId: string) =>
    [...uncertaintyKeys.all, 'decomposition', modelId] as const,
};

/**
 * Query keys for evaluation-related data
 */
export const evaluationKeys = {
  all: ['evaluation'] as const,
  lists: () => [...evaluationKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...evaluationKeys.lists(), filters] as const,
  details: () => [...evaluationKeys.all, 'detail'] as const,
  detail: (id: string) => [...evaluationKeys.details(), id] as const,
  scenarios: () => [...evaluationKeys.all, 'scenarios'] as const,
  scenario: (id: string) => [...evaluationKeys.scenarios(), id] as const,
  results: (scenarioId: string) =>
    [...evaluationKeys.all, 'results', scenarioId] as const,
  aggregated: (scenarioIds?: string[]) =>
    [...evaluationKeys.all, 'aggregated', scenarioIds] as const,
};

/**
 * Query keys for safety-related data
 */
export const safetyKeys = {
  all: ['safety'] as const,
  lists: () => [...safetyKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...safetyKeys.lists(), filters] as const,
  details: () => [...safetyKeys.all, 'detail'] as const,
  detail: (id: string) => [...safetyKeys.details(), id] as const,
  monitors: () => [...safetyKeys.all, 'monitors'] as const,
  monitor: (id: string) => [...safetyKeys.monitors(), id] as const,
  mitigationState: () => [...safetyKeys.all, 'mitigationState'] as const,
  envelope: (id: string) => [...safetyKeys.all, 'envelope', id] as const,
  timeline: (params?: { start?: number; end?: number }) =>
    [...safetyKeys.all, 'timeline', params] as const,
};

/**
 * Query keys for active learning-related data
 */
export const activeLearningKeys = {
  all: ['activeLearning'] as const,
  lists: () => [...activeLearningKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...activeLearningKeys.lists(), filters] as const,
  details: () => [...activeLearningKeys.all, 'detail'] as const,
  detail: (id: string) => [...activeLearningKeys.details(), id] as const,
  samples: (filters?: ListFilters) =>
    [...activeLearningKeys.all, 'samples', filters] as const,
  sample: (id: string) => [...activeLearningKeys.samples(), id] as const,
  acquisitionConfig: () => [...activeLearningKeys.all, 'acquisitionConfig'] as const,
  batchSelection: (batchId: string) =>
    [...activeLearningKeys.all, 'batchSelection', batchId] as const,
};

/**
 * Query keys for conformal prediction data
 */
export const conformalKeys = {
  all: ['conformal'] as const,
  lists: () => [...conformalKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...conformalKeys.lists(), filters] as const,
  details: () => [...conformalKeys.all, 'detail'] as const,
  detail: (id: string) => [...conformalKeys.details(), id] as const,
  calibration: (id: string) => [...conformalKeys.all, 'calibration', id] as const,
  prediction: (id: string) => [...conformalKeys.all, 'prediction', id] as const,
};

/**
 * Query keys for OOD detection data
 */
export const oodKeys = {
  all: ['ood'] as const,
  lists: () => [...oodKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...oodKeys.lists(), filters] as const,
  details: () => [...oodKeys.all, 'detail'] as const,
  detail: (id: string) => [...oodKeys.details(), id] as const,
  detection: (inputHash: string) => [...oodKeys.all, 'detection', inputHash] as const,
  threshold: (detectorType: string) =>
    [...oodKeys.all, 'threshold', detectorType] as const,
};

/**
 * Query keys for calibration metrics
 */
export const calibrationKeys = {
  all: ['calibration'] as const,
  lists: () => [...calibrationKeys.all, 'list'] as const,
  list: (filters: ListFilters = {}) => [...calibrationKeys.lists(), filters] as const,
  details: () => [...calibrationKeys.all, 'detail'] as const,
  detail: (id: string) => [...calibrationKeys.details(), id] as const,
  metrics: (modelId: string) => [...calibrationKeys.all, 'metrics', modelId] as const,
};

// ============================================================================
// Invalidation Helpers
// ============================================================================

/**
 * Get all keys that should be invalidated when uncertainty data changes
 */
export function getUncertaintyInvalidationKeys() {
  return [uncertaintyKeys.all, safetyKeys.all];
}

/**
 * Get all keys that should be invalidated when evaluation data changes
 */
export function getEvaluationInvalidationKeys() {
  return [evaluationKeys.all];
}

/**
 * Get all keys that should be invalidated when safety data changes
 */
export function getSafetyInvalidationKeys() {
  return [safetyKeys.all, uncertaintyKeys.all];
}

/**
 * Get all keys that should be invalidated when active learning data changes
 */
export function getActiveLearningInvalidationKeys() {
  return [activeLearningKeys.all];
}
