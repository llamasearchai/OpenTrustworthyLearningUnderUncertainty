import {
  Scenario,
  MonitorOutput,
  SampleMetadata,
  UncertaintyEstimate,
  RiskAssessment,
  MitigationState,
  SafetyMarginTimeline,
  CalibrationMetrics,
} from '@/types/api';
import {
  createTLUSceneData,
  createDecisionFactors,
  type TLUObjectData,
  type TLUSceneData,
} from './factories';

// ============================================================================
// Scenario Presets
// ============================================================================

export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'sc_urban_heavy_traffic',
    tags: {
      environment: 'urban',
      traffic: 'heavy',
      weather: 'clear',
      time_of_day: 'day',
    },
    data: {
      description: 'Downtown intersection with heavy pedestrian traffic and occlusion.',
      difficulty: 'hard',
      expected_behavior: 'defensive_yield',
    },
  },
  {
    id: 'sc_highway_rain_night',
    tags: {
      environment: 'highway',
      traffic: 'light',
      weather: 'rain',
      time_of_day: 'night',
    },
    data: {
      description: 'High-speed highway driving with poor visibility and wet road surface.',
      difficulty: 'medium',
      expected_behavior: 'maintain_lane_cautious_speed',
    },
  },
  {
    id: 'sc_rural_animal_crossing',
    tags: {
      environment: 'rural',
      traffic: 'none',
      weather: 'fog',
      time_of_day: 'dawn',
    },
    data: {
      description: 'Rural road with potential deer crossing in heavy fog.',
      difficulty: 'medium',
      expected_behavior: 'scan_and_slow',
    },
  },
  {
    id: 'sc_suburban_nominal',
    tags: {
      environment: 'suburban',
      traffic: 'moderate',
      weather: 'clear',
      time_of_day: 'day',
    },
    data: {
      description: 'Standard suburban driving conditions with clear visibility.',
      difficulty: 'easy',
      expected_behavior: 'standard_cruise',
    },
  },
];

// ============================================================================
// Monitor Output Presets
// ============================================================================

export const PRESET_MONITORS: MonitorOutput[] = [
  {
    monitor_id: 'ttc-monitor',
    triggered: true,
    severity: 0.85,
    message: 'Time-to-collision < 1.5s: Immediate braking required.',
    timestamp: Date.now(),
  },
  {
    monitor_id: 'ood-monitor',
    triggered: false,
    severity: 0.1,
    message: 'Input features within standard distribution.',
    timestamp: Date.now(),
  },
  {
    monitor_id: 'lane-departure',
    triggered: true,
    severity: 0.4,
    message: 'Drifting left: Lane centering active.',
    timestamp: Date.now(),
  },
  {
    monitor_id: 'system-health',
    triggered: false,
    severity: 0.0,
    message: 'All subsystems nominal.',
    timestamp: Date.now(),
  },
];

// ============================================================================
// Uncertainty & Risk Presets
// ============================================================================

const highUncertainty: UncertaintyEstimate = {
  confidence: 0.35,
  aleatoric_score: 0.2,
  epistemic_score: 0.45,
  source: 'deep_ensemble',
  conformal_set_size: 5,
  coverage_probability: 0.95,
};

const lowUncertainty: UncertaintyEstimate = {
  confidence: 0.98,
  aleatoric_score: 0.01,
  epistemic_score: 0.01,
  source: 'deep_ensemble',
  conformal_set_size: 1,
  coverage_probability: 0.95,
};

const highRisk: RiskAssessment = {
  expected_risk: 0.8,
  tail_risk_cvar: 0.95,
  violation_probability: 0.4,
  is_acceptable: false,
};

const lowRisk: RiskAssessment = {
  expected_risk: 0.05,
  tail_risk_cvar: 0.1,
  violation_probability: 0.01,
  is_acceptable: true,
};

// ============================================================================
// Sample Presets (Active Learning)
// ============================================================================

export const PRESET_SAMPLES: SampleMetadata[] = [
  {
    id: 'smp_corner_case_001',
    uncertainty: highUncertainty,
    risk: highRisk,
    novelty_score: 0.95,
    embedding: [0.1, 0.9, 0.4],
  },
  {
    id: 'smp_nominal_day_002',
    uncertainty: lowUncertainty,
    risk: lowRisk,
    novelty_score: 0.1,
    embedding: [0.8, 0.1, 0.1],
  },
  {
    id: 'smp_edge_snow_003',
    uncertainty: { ...highUncertainty, confidence: 0.5 },
    risk: { ...highRisk, is_acceptable: true }, // Borderline
    novelty_score: 0.7,
    embedding: [0.5, 0.5, 0.8],
  },
];

// ============================================================================
// Timeline Presets
// ============================================================================

export const PRESET_TIMELINE: SafetyMarginTimeline[] = Array.from({ length: 20 }, (_, i) => ({
  timestamp: Date.now() - i * 1000,
  mitigation_state: i < 5 ? 'cautious' : i < 10 ? 'nominal' : 'fallback',
  constraint_margins: {
    speed_limit: Math.max(0, 10 - i * 0.5 + Math.random()),
    lane_boundary: Math.max(0, 2 - i * 0.1 + Math.random() * 0.2),
  },
  ood_score: i > 15 ? 0.8 : 0.1,
  severity: i > 15 ? 0.9 : 0.0,
}));

// ============================================================================
// TLU 3D Viewer Scene Presets (Generated using factory functions)
// ============================================================================

// Generate preset scenes using factory functions for complete data
const _baseScene = createTLUSceneData(6);

export const PRESET_TLU_SCENE_NOMINAL: TLUSceneData = {
  ...createTLUSceneData(6),
  globalState: {
    ...createTLUSceneData(6).globalState,
    mitigation_state: 'nominal',
    overall_uncertainty: {
      confidence: 0.92,
      aleatoric_score: 0.05,
      epistemic_score: 0.08,
      source: 'aggregated_ensemble',
      conformal_set_size: 1,
      coverage_probability: 0.95,
    },
    overall_risk: {
      expected_risk: 0.12,
      tail_risk_cvar: 0.22,
      violation_probability: 0.05,
      is_acceptable: true,
    },
    decision_factors: createDecisionFactors('nominal'),
    ood_status: {
      any_ood: false,
      max_ood_score: 0.15,
      ood_object_ids: [],
    },
  },
};

export const PRESET_TLU_SCENE_CAUTIOUS: TLUSceneData = {
  ...createTLUSceneData(6),
  globalState: {
    ...createTLUSceneData(6).globalState,
    mitigation_state: 'cautious',
    overall_uncertainty: {
      confidence: 0.72,
      aleatoric_score: 0.12,
      epistemic_score: 0.22,
      source: 'aggregated_ensemble',
      conformal_set_size: 2,
      coverage_probability: 0.9,
    },
    overall_risk: {
      expected_risk: 0.35,
      tail_risk_cvar: 0.52,
      violation_probability: 0.18,
      is_acceptable: true,
    },
    decision_factors: createDecisionFactors('cautious'),
    ood_status: {
      any_ood: true,
      max_ood_score: 0.35,
      ood_object_ids: ['object-1'],
    },
  },
};

export const PRESET_TLU_SCENE_CRITICAL: TLUSceneData = {
  ...createTLUSceneData(6),
  globalState: {
    ...createTLUSceneData(6).globalState,
    mitigation_state: 'fallback',
    overall_uncertainty: {
      confidence: 0.42,
      aleatoric_score: 0.25,
      epistemic_score: 0.48,
      source: 'aggregated_ensemble',
      conformal_set_size: 4,
      coverage_probability: 0.85,
    },
    overall_risk: {
      expected_risk: 0.72,
      tail_risk_cvar: 0.88,
      violation_probability: 0.45,
      is_acceptable: false,
    },
    decision_factors: createDecisionFactors('fallback'),
    ood_status: {
      any_ood: true,
      max_ood_score: 0.65,
      ood_object_ids: ['object-0', 'object-2'],
    },
  },
};

// ============================================================================
// Calibration Presets
// ============================================================================

export const PRESET_CALIBRATION_METRICS: CalibrationMetrics = {
  ece: 0.042,
  brier_score: 0.085,
  nll: 0.12,
  bins: [
    { confidence: 0.95, accuracy: 0.92, count: 150 },
    { confidence: 0.85, accuracy: 0.83, count: 280 },
    { confidence: 0.75, accuracy: 0.72, count: 320 },
    { confidence: 0.65, accuracy: 0.64, count: 250 },
    { confidence: 0.55, accuracy: 0.52, count: 180 },
    { confidence: 0.45, accuracy: 0.44, count: 120 },
    { confidence: 0.35, accuracy: 0.33, count: 80 },
    { confidence: 0.25, accuracy: 0.26, count: 50 },
    { confidence: 0.15, accuracy: 0.16, count: 30 },
    { confidence: 0.05, accuracy: 0.06, count: 15 },
  ],
};

// ============================================================================
// Dashboard Summary Presets
// ============================================================================

export const PRESET_DASHBOARD_SUMMARY = {
  totalScenarios: 1247,
  passRate: 0.943,
  avgConfidence: 0.87,
  avgCalibrationError: 0.042,
  activeMonitors: 12,
  triggeredAlerts: 3,
  currentMitigationState: 'nominal' as MitigationState,
  systemUptime: 99.97,
  lastEvaluationTime: Date.now() - 300000, // 5 minutes ago
};
