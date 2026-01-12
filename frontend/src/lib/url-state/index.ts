/**
 * URL State Synchronization with nuqs
 *
 * Type-safe URL parameter management for filter, sort, pagination, and view states.
 *
 * @module lib/url-state
 */

import {
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsStringEnum,
  parseAsIsoDateTime,
  createParser,
  useQueryState,
  useQueryStates,
  type ParserBuilder,
} from 'nuqs';

// ============================================================================
// Custom Parsers
// ============================================================================

/**
 * Parse a number with optional default
 */
export const parseAsNumber = createParser({
  parse: (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },
  serialize: (value) => value.toString(),
});

/**
 * Parse a JSON object from URL
 */
export function parseAsJson<T>() {
  return createParser<T>({
    parse: (value) => {
      try {
        return JSON.parse(decodeURIComponent(value)) as T;
      } catch {
        return null;
      }
    },
    serialize: (value) => encodeURIComponent(JSON.stringify(value)),
  });
}

/**
 * Parse a date range object
 */
export const parseAsDateRange = createParser<{ start: string; end: string }>({
  parse: (value) => {
    try {
      const [start, end] = value.split(',');
      if (!start || !end) return null;
      return { start, end };
    } catch {
      return null;
    }
  },
  serialize: (value) => `${value.start},${value.end}`,
});

// ============================================================================
// Common URL State Schemas
// ============================================================================

/**
 * Standard pagination parameters
 */
export const paginationParsers = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

/**
 * Standard sort parameters
 */
export const sortParsers = {
  sortBy: parseAsString,
  sortOrder: parseAsStringEnum(['asc', 'desc']).withDefault('asc'),
};

/**
 * Standard filter parameters
 */
export const filterParsers = {
  search: parseAsString,
  status: parseAsString,
  tags: parseAsArrayOf(parseAsString),
};

/**
 * View mode parameters
 */
export const viewParsers = {
  view: parseAsStringEnum(['grid', 'list', 'table']).withDefault('table'),
  columns: parseAsArrayOf(parseAsString),
};

/**
 * Date range parameters
 */
export const dateRangeParsers = {
  startDate: parseAsIsoDateTime,
  endDate: parseAsIsoDateTime,
};

// ============================================================================
// Pre-configured URL State Hooks
// ============================================================================

/**
 * Use pagination URL state
 */
export function usePaginationState() {
  return useQueryStates(paginationParsers);
}

/**
 * Use sort URL state
 */
export function useSortState() {
  return useQueryStates(sortParsers);
}

/**
 * Use combined table state (pagination + sort + filter)
 */
export function useTableUrlState() {
  return useQueryStates({
    ...paginationParsers,
    ...sortParsers,
    search: parseAsString,
  });
}

/**
 * Use filter URL state with custom filters
 */
export function useFilterUrlState<T extends Record<string, ParserBuilder<unknown>>>(
  customFilters: T
) {
  return useQueryStates({
    ...filterParsers,
    ...customFilters,
  });
}

// ============================================================================
// OpenTLU-Specific URL State
// ============================================================================

/**
 * Uncertainty view URL parameters
 */
export const uncertaintyUrlParsers = {
  modelId: parseAsString,
  showAleatoric: parseAsBoolean.withDefault(true),
  showEpistemic: parseAsBoolean.withDefault(true),
  timeRange: parseAsDateRange,
  threshold: parseAsNumber,
};

/**
 * Evaluation view URL parameters
 */
export const evaluationUrlParsers = {
  scenarioId: parseAsString,
  ...paginationParsers,
  ...sortParsers,
  tags: parseAsArrayOf(parseAsString),
  passedOnly: parseAsBoolean.withDefault(false),
};

/**
 * Safety monitor URL parameters
 */
export const safetyUrlParsers = {
  monitorId: parseAsString,
  mitigationState: parseAsStringEnum([
    'nominal',
    'cautious',
    'fallback',
    'safe_stop',
    'human_escalation',
  ]),
  severityMin: parseAsNumber,
  triggeredOnly: parseAsBoolean.withDefault(false),
  timeRange: parseAsDateRange,
};

/**
 * Active learning URL parameters
 */
export const activeLearningUrlParsers = {
  ...paginationParsers,
  sortBy: parseAsStringEnum(['uncertainty', 'risk', 'novelty']).withDefault('uncertainty'),
  sortOrder: parseAsStringEnum(['asc', 'desc']).withDefault('desc'),
  batchSize: parseAsInteger.withDefault(10),
};

/**
 * 3D viewer URL parameters
 */
export const viewerUrlParsers = {
  objectId: parseAsString,
  cameraPreset: parseAsStringEnum(['front', 'back', 'left', 'right', 'top', 'bottom', 'iso']),
  showGrid: parseAsBoolean.withDefault(true),
  showAxes: parseAsBoolean.withDefault(true),
  qualityLevel: parseAsStringEnum(['low', 'medium', 'high']).withDefault('medium'),
};

// ============================================================================
// Hook Factories
// ============================================================================

/**
 * Create a URL state hook for uncertainty views
 */
export function useUncertaintyUrlState() {
  return useQueryStates(uncertaintyUrlParsers);
}

/**
 * Create a URL state hook for evaluation views
 */
export function useEvaluationUrlState() {
  return useQueryStates(evaluationUrlParsers);
}

/**
 * Create a URL state hook for safety views
 */
export function useSafetyUrlState() {
  return useQueryStates(safetyUrlParsers);
}

/**
 * Create a URL state hook for active learning views
 */
export function useActiveLearningUrlState() {
  return useQueryStates(activeLearningUrlParsers);
}

/**
 * Create a URL state hook for 3D viewer
 */
export function useViewerUrlState() {
  return useQueryStates(viewerUrlParsers);
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsStringEnum,
  parseAsIsoDateTime,
  createParser,
  useQueryState,
  useQueryStates,
};
