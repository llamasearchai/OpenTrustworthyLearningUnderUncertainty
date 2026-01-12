/**
 * Zod Validation Schemas for OpenTLU API
 *
 * Runtime validation schemas matching all TypeScript interfaces for API
 * boundary validation, ensuring type safety at runtime.
 *
 * @module lib/validations/api-schemas
 */

import { z } from 'zod';

// ============================================================================
// Enum Schemas
// ============================================================================

export const uncertaintyTypeSchema = z.enum(['aleatoric', 'epistemic']);

export const mitigationStateSchema = z.enum([
  'nominal',
  'cautious',
  'fallback',
  'safe_stop',
  'human_escalation',
]);

export const oodDetectorTypeSchema = z.enum([
  'mahalanobis',
  'energy',
  'label_shift',
  'ensemble',
]);

export const webSocketMessageTypeSchema = z.enum([
  'uncertainty_update',
  'monitor_alert',
  'state_change',
  'evaluation_progress',
  'ood_detection',
]);

export const ttcModelSchema = z.enum(['constant_velocity', 'constant_acceleration']);

// ============================================================================
// Core Domain Schemas
// ============================================================================

export const uncertaintyEstimateSchema = z.object({
  confidence: z.number().min(0).max(1),
  aleatoric_score: z.number().min(0),
  epistemic_score: z.number().min(0),
  source: z.string(),
  conformal_set_size: z.number().int().min(0).optional(),
  coverage_probability: z.number().min(0).max(1).optional(),
  prediction_set: z.array(z.number()).optional(),
});

export const riskAssessmentSchema = z.object({
  expected_risk: z.number().min(0),
  tail_risk_cvar: z.number().min(0),
  violation_probability: z.number().min(0).max(1),
  is_acceptable: z.boolean(),
});

export const safetyEnvelopeSchema = z.object({
  hard_constraints: z.array(z.string()),
  soft_constraints: z.array(z.string()),
  violation_threshold: z.number().min(0).max(1),
});

export const monitorOutputSchema = z.object({
  monitor_id: z.string(),
  triggered: z.boolean(),
  severity: z.number().min(0).max(1),
  message: z.string(),
  timestamp: z.number(),
});

// ============================================================================
// Conformal Prediction Schemas
// ============================================================================

export const conformalConfigSchema = z.object({
  coverage: z.number().min(0).max(1).default(0.9),
  min_calibration_size: z.number().int().min(1).default(100),
  score_clip_percentile: z.number().min(0).max(100).default(99.0),
});

export const conformalResultSchema = z.object({
  prediction_set: z.array(z.number()),
  set_size: z.number().int().min(0),
  coverage_probability: z.number().min(0).max(1),
  quantile: z.number(),
  is_valid: z.boolean(),
  message: z.string().optional(),
});

export const calibrationDataSchema = z.object({
  calibration_id: z.string(),
  quantile: z.number(),
  coverage: z.number().min(0).max(1),
  n_samples: z.number().int().min(0),
  method: z.string(),
  class_quantiles: z.record(z.number(), z.number()).optional(),
  created_at: z.number(),
});

// ============================================================================
// OOD Detection Schemas
// ============================================================================

export const oodResultSchema = z.object({
  ensemble_score: z.number(),
  component_scores: z.record(z.string(), z.number()),
  is_ood: z.boolean(),
  contributing_detector: z.string(),
  threshold: z.number(),
});

// ============================================================================
// Evaluation Schemas
// ============================================================================

export const scenarioSchema = z.object({
  id: z.string(),
  tags: z.record(z.string(), z.string()),
  data: z.unknown(),
});

export const evaluationResultSchema = z.object({
  scenario_id: z.string(),
  metrics: z.record(z.string(), z.number()),
  passed: z.boolean(),
});

export const aggregatedResultsSchema = z.object({
  total_scenarios: z.number().int().min(0),
  pass_rate: z.number().min(0).max(1),
  mean_metrics: z.record(z.string(), z.number()),
});

// ============================================================================
// Active Learning Schemas
// ============================================================================

export const sampleMetadataSchema = z.object({
  id: z.string(),
  uncertainty: uncertaintyEstimateSchema,
  risk: riskAssessmentSchema,
  novelty_score: z.number(),
  embedding: z.array(z.number()).optional(),
});

export const acquisitionConfigSchema = z.object({
  weight_uncertainty: z.number().default(1.0),
  weight_risk: z.number().default(2.0),
  weight_novelty: z.number().default(0.5),
  diversity_penalty: z.number().default(0.1),
});

export const batchSelectionResultSchema = z.object({
  selected_ids: z.array(z.string()),
  selected_indices: z.array(z.number().int()),
  diversity_score: z.number(),
  coverage_score: z.number(),
  method: z.string(),
});

// ============================================================================
// Safety Monitor Schemas
// ============================================================================

export const ttcConfigSchema = z.object({
  critical_ttc: z.number().positive().default(1.0),
  warning_ttc: z.number().positive().default(3.0),
  model: ttcModelSchema.default('constant_velocity'),
  debounce_steps: z.number().int().min(0).default(3),
  min_closing_velocity: z.number().min(0).default(0.1),
});

export const trackedObjectSchema = z.object({
  object_id: z.string(),
  position: z.array(z.number()),
  velocity: z.array(z.number()),
  acceleration: z.array(z.number()).optional(),
});

// ============================================================================
// Safety Filter Schemas
// ============================================================================

export const filteredActionSchema = z.object({
  action: z.array(z.number()),
  was_modified: z.boolean(),
  constraint_margins: z.record(z.string(), z.number()),
  fallback_used: z.boolean(),
  violation_type: z.string().optional(),
});

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  request_id: z.string().optional(),
});

export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    page_size: z.number().int().min(1),
    has_more: z.boolean(),
  });
}

export const webSocketMessageSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    type: webSocketMessageTypeSchema,
    payload: payloadSchema,
    timestamp: z.number(),
    sequence: z.number().int().optional(),
  });

// ============================================================================
// Metrics & Visualization Schemas
// ============================================================================

export const timeSeriesPointSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
  label: z.string().optional(),
});

export const uncertaintyDecompositionSchema = z.object({
  total: z.number(),
  aleatoric: z.number(),
  epistemic: z.number(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
});

export const calibrationBinSchema = z.object({
  confidence: z.number(),
  accuracy: z.number(),
  count: z.number().int().min(0),
});

export const calibrationMetricsSchema = z.object({
  ece: z.number(),
  brier_score: z.number(),
  nll: z.number(),
  bins: z.array(calibrationBinSchema),
});

export const safetyMarginTimelineSchema = z.object({
  timestamp: z.number(),
  mitigation_state: mitigationStateSchema,
  constraint_margins: z.record(z.string(), z.number()),
  ood_score: z.number(),
  severity: z.number().min(0).max(1),
});

// ============================================================================
// Request Schemas (for form validation)
// ============================================================================

export const evaluateRequestSchema = z.object({
  scenario_id: z.string().min(1, 'Scenario ID is required'),
  metrics: z.array(z.string()).min(1, 'At least one metric is required'),
});

export const filterActionRequestSchema = z.object({
  action: z.array(z.number()).min(1, 'Action vector is required'),
  safety_envelope: safetyEnvelopeSchema.optional(),
});

export const selectBatchRequestSchema = z.object({
  sample_ids: z.array(z.string()).min(1, 'At least one sample is required'),
  batch_size: z.number().int().min(1).max(1000),
  config: acquisitionConfigSchema.optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type UncertaintyEstimateSchema = z.infer<typeof uncertaintyEstimateSchema>;
export type RiskAssessmentSchema = z.infer<typeof riskAssessmentSchema>;
export type SafetyEnvelopeSchema = z.infer<typeof safetyEnvelopeSchema>;
export type MonitorOutputSchema = z.infer<typeof monitorOutputSchema>;
export type ConformalConfigSchema = z.infer<typeof conformalConfigSchema>;
export type ConformalResultSchema = z.infer<typeof conformalResultSchema>;
export type OODResultSchema = z.infer<typeof oodResultSchema>;
export type ScenarioSchema = z.infer<typeof scenarioSchema>;
export type EvaluationResultSchema = z.infer<typeof evaluationResultSchema>;
export type SampleMetadataSchema = z.infer<typeof sampleMetadataSchema>;
export type AcquisitionConfigSchema = z.infer<typeof acquisitionConfigSchema>;
export type BatchSelectionResultSchema = z.infer<typeof batchSelectionResultSchema>;
export type TTCConfigSchema = z.infer<typeof ttcConfigSchema>;
export type TrackedObjectSchema = z.infer<typeof trackedObjectSchema>;
export type FilteredActionSchema = z.infer<typeof filteredActionSchema>;
export type ApiErrorSchema = z.infer<typeof apiErrorSchema>;
export type TimeSeriesPointSchema = z.infer<typeof timeSeriesPointSchema>;
export type SafetyMarginTimelineSchema = z.infer<typeof safetyMarginTimelineSchema>;
