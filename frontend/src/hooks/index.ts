/**
 * Hooks Module Exports
 * @module hooks
 */

// Uncertainty hooks
export {
  useUncertaintyEstimate,
  useUncertaintyHistory,
  useUncertaintyDecomposition,
  useDecomposeUncertainty,
  useUncertaintyLevel,
  useUncertaintySubscription,
} from './useUncertainty';

// Evaluation hooks
export {
  useScenarios,
  useScenariosInfinite,
  useScenario,
  useEvaluationResults,
  useAggregatedMetrics,
  useRunEvaluation,
  useCreateScenario,
  useDeleteScenario,
  usePassRate,
  useScenarioSearch,
} from './useEvaluation';

// Safety hooks
export {
  useMonitors,
  useMonitorOutput,
  useMitigationState,
  useSafetyTimeline,
  useFilterAction,
  useMonitorAlerts,
  useMitigationStateSubscription,
  useTriggeredMonitors,
  useSafetyStatus,
  useActionSafetyCheck,
} from './useSafety';

// Active learning hooks
export {
  useSamples,
  useSamplesInfinite,
  useAcquisitionConfig,
  useBatchSelection,
  useUpdateAcquisitionConfig,
  useRankedSamples,
  useHighUncertaintySamples,
  useHighRiskSamples,
  useBatchSelectionPreview,
} from './useActiveLearning';
