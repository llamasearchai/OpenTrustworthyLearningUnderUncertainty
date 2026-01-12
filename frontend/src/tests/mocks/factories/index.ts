/**
 * Test Data Factories
 *
 * Generate realistic mock data for tests.
 *
 * @module tests/mocks/factories
 */

import { faker } from '@faker-js/faker';
import type {
  UncertaintyEstimate,
  RiskAssessment,
  MonitorOutput,
  Scenario,
  EvaluationResult,
  SampleMetadata,
  AcquisitionConfig,
  BatchSelectionResult,
  OODResult,
  ConformalResult,
  FilteredAction,
  SafetyMarginTimeline,
  MitigationState,
} from '@/types/api';

// ============================================================================
// Uncertainty Factories
// ============================================================================

export function createUncertaintyEstimate(
  overrides: Partial<UncertaintyEstimate> = {}
): UncertaintyEstimate {
  const aleatoric = overrides.aleatoric_score ?? faker.number.float({ min: 0, max: 0.5 });
  const epistemic = overrides.epistemic_score ?? faker.number.float({ min: 0, max: 0.5 });
  const total = aleatoric + epistemic;

  return {
    confidence: overrides.confidence ?? 1 - total,
    aleatoric_score: aleatoric,
    epistemic_score: epistemic,
    source: overrides.source ?? faker.helpers.arrayElement([
      'ensemble_variance',
      'mc_dropout',
      'deep_ensemble',
      'evidential',
    ]),
    conformal_set_size: overrides.conformal_set_size,
    coverage_probability: overrides.coverage_probability,
    prediction_set: overrides.prediction_set,
    ...overrides,
  };
}

export function createRiskAssessment(
  overrides: Partial<RiskAssessment> = {}
): RiskAssessment {
  const expectedRisk = overrides.expected_risk ?? faker.number.float({ min: 0, max: 1 });

  return {
    expected_risk: expectedRisk,
    tail_risk_cvar: overrides.tail_risk_cvar ?? expectedRisk * 1.5,
    violation_probability: overrides.violation_probability ?? faker.number.float({ min: 0, max: 0.3 }),
    is_acceptable: overrides.is_acceptable ?? expectedRisk < 0.5,
    ...overrides,
  };
}

// ============================================================================
// Monitor Factories
// ============================================================================

export function createMonitorOutput(
  overrides: Partial<MonitorOutput> = {}
): MonitorOutput {
  const triggered = overrides.triggered ?? faker.datatype.boolean();

  return {
    monitor_id: overrides.monitor_id ?? faker.string.uuid(),
    triggered,
    severity: overrides.severity ?? (triggered ? faker.number.float({ min: 0.3, max: 1 }) : 0),
    message: overrides.message ?? (triggered
      ? faker.helpers.arrayElement([
          'Threshold exceeded',
          'Anomaly detected',
          'Safety constraint violated',
          'OOD input detected',
        ])
      : 'Normal operation'),
    timestamp: overrides.timestamp ?? Date.now(),
    ...overrides,
  };
}

export function createMitigationState(): MitigationState {
  return faker.helpers.arrayElement([
    'nominal',
    'cautious',
    'fallback',
    'safe_stop',
    'human_escalation',
  ]);
}

// ============================================================================
// Scenario Factories
// ============================================================================

export function createScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: overrides.id ?? faker.string.uuid(),
    tags: overrides.tags ?? {
      environment: faker.helpers.arrayElement(['urban', 'highway', 'rural']),
      weather: faker.helpers.arrayElement(['clear', 'rain', 'fog', 'snow']),
      time_of_day: faker.helpers.arrayElement(['day', 'night', 'dawn', 'dusk']),
    },
    data: overrides.data ?? {
      description: faker.lorem.sentence(),
      difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    },
    ...overrides,
  };
}

export function createEvaluationResult(
  overrides: Partial<EvaluationResult> = {}
): EvaluationResult {
  const metrics = overrides.metrics ?? {
    accuracy: faker.number.float({ min: 0.7, max: 1 }),
    f1_score: faker.number.float({ min: 0.6, max: 1 }),
    safety_rate: faker.number.float({ min: 0.8, max: 1 }),
    latency_ms: faker.number.float({ min: 10, max: 100 }),
  };

  return {
    scenario_id: overrides.scenario_id ?? faker.string.uuid(),
    metrics,
    passed: overrides.passed ?? Object.values(metrics).every((v) => v > 0.7),
    ...overrides,
  };
}

// ============================================================================
// Active Learning Factories
// ============================================================================

export function createSampleMetadata(
  overrides: Partial<SampleMetadata> = {}
): SampleMetadata {
  return {
    id: overrides.id ?? faker.string.uuid(),
    uncertainty: overrides.uncertainty ?? createUncertaintyEstimate(),
    risk: overrides.risk ?? createRiskAssessment(),
    novelty_score: overrides.novelty_score ?? faker.number.float({ min: 0, max: 1 }),
    embedding: overrides.embedding,
    ...overrides,
  };
}

export function createAcquisitionConfig(
  overrides: Partial<AcquisitionConfig> = {}
): AcquisitionConfig {
  return {
    weight_uncertainty: overrides.weight_uncertainty ?? 1.0,
    weight_risk: overrides.weight_risk ?? 2.0,
    weight_novelty: overrides.weight_novelty ?? 0.5,
    diversity_penalty: overrides.diversity_penalty ?? 0.1,
    ...overrides,
  };
}

export function createBatchSelectionResult(
  overrides: Partial<BatchSelectionResult> = {}
): BatchSelectionResult {
  const count = overrides.selected_ids?.length ?? 5;
  const ids = overrides.selected_ids ?? Array.from({ length: count }, () => faker.string.uuid());

  return {
    selected_ids: ids,
    selected_indices: overrides.selected_indices ?? ids.map((_, i) => i),
    diversity_score: overrides.diversity_score ?? faker.number.float({ min: 0.5, max: 1 }),
    coverage_score: overrides.coverage_score ?? faker.number.float({ min: 0.6, max: 1 }),
    method: overrides.method ?? 'greedy_batch',
    ...overrides,
  };
}

// ============================================================================
// OOD Factories
// ============================================================================

export function createOODResult(overrides: Partial<OODResult> = {}): OODResult {
  const isOOD = overrides.is_ood ?? faker.datatype.boolean();

  return {
    ensemble_score: overrides.ensemble_score ?? faker.number.float({ min: 0, max: 1 }),
    component_scores: overrides.component_scores ?? {
      mahalanobis: faker.number.float({ min: 0, max: 1 }),
      energy: faker.number.float({ min: 0, max: 1 }),
      label_shift: faker.number.float({ min: 0, max: 1 }),
    },
    is_ood: isOOD,
    contributing_detector: overrides.contributing_detector ?? faker.helpers.arrayElement([
      'mahalanobis',
      'energy',
      'label_shift',
    ]),
    threshold: overrides.threshold ?? 0.5,
    ...overrides,
  };
}

// ============================================================================
// Conformal Factories
// ============================================================================

export function createConformalResult(
  overrides: Partial<ConformalResult> = {}
): ConformalResult {
  const setSize = overrides.set_size ?? faker.number.int({ min: 1, max: 5 });

  return {
    prediction_set: overrides.prediction_set ?? Array.from({ length: setSize }, (_, i) => i),
    set_size: setSize,
    coverage_probability: overrides.coverage_probability ?? 0.9,
    quantile: overrides.quantile ?? faker.number.float({ min: 0.8, max: 0.99 }),
    is_valid: overrides.is_valid ?? true,
    message: overrides.message,
    ...overrides,
  };
}

// ============================================================================
// Safety Factories
// ============================================================================

export function createFilteredAction(
  overrides: Partial<FilteredAction> = {}
): FilteredAction {
  const wasModified = overrides.was_modified ?? faker.datatype.boolean();

  return {
    action: overrides.action ?? [
      faker.number.float({ min: -1, max: 1 }),
      faker.number.float({ min: -1, max: 1 }),
    ],
    was_modified: wasModified,
    constraint_margins: overrides.constraint_margins ?? {
      speed_limit: faker.number.float({ min: 0, max: 10 }),
      lane_boundary: faker.number.float({ min: 0, max: 2 }),
      collision_margin: faker.number.float({ min: 0, max: 5 }),
    },
    fallback_used: overrides.fallback_used ?? (wasModified && faker.datatype.boolean()),
    violation_type: overrides.violation_type,
    ...overrides,
  };
}

export function createSafetyMarginTimeline(
  overrides: Partial<SafetyMarginTimeline> = {}
): SafetyMarginTimeline {
  return {
    timestamp: overrides.timestamp ?? Date.now(),
    mitigation_state: overrides.mitigation_state ?? createMitigationState(),
    constraint_margins: overrides.constraint_margins ?? {
      speed_limit: faker.number.float({ min: 0, max: 10 }),
      lane_boundary: faker.number.float({ min: 0, max: 2 }),
    },
    ood_score: overrides.ood_score ?? faker.number.float({ min: 0, max: 1 }),
    severity: overrides.severity ?? faker.number.float({ min: 0, max: 1 }),
    ...overrides,
  };
}

// ============================================================================
// Batch Factories
// ============================================================================

export function createMany<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overridesArray?: Array<Partial<T>>
): T[] {
  return Array.from({ length: count }, (_, i) =>
    factory(overridesArray?.[i])
  );
}
