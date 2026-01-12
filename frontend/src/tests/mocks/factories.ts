/**
 * Mock Data Factories
 *
 * Factory functions for generating consistent mock data across tests.
 *
 * @module tests/mocks/factories
 */

import type {
  UncertaintyEstimate,
  Scenario,
  EvaluationResult,
  MonitorOutput,
  SafetyMarginTimeline,
  SampleMetadata,
  TimeSeriesPoint,
  UncertaintyDecomposition,
  CalibrationMetrics,
  AcquisitionConfig,
  BatchSelectionResult,
  OODResult,
  FilteredAction,
  MitigationState,
  RiskAssessment,
  ConformalResult,
} from '@/types/api';

// ============================================================================
// Uncertainty Factories
// ============================================================================

export function createUncertaintyEstimate(overrides?: Partial<UncertaintyEstimate>): UncertaintyEstimate {
  return {
    confidence: 0.85,
    aleatoric_score: 0.15,
    epistemic_score: 0.25,
    source: 'ensemble_variance',
    conformal_set_size: 3,
    coverage_probability: 0.9,
    prediction_set: [0, 1, 2],
    ...overrides,
  };
}

export function createUncertaintyDecomposition(
  overrides?: Partial<UncertaintyDecomposition>
): UncertaintyDecomposition {
  return {
    total: 0.4,
    aleatoric: 0.15,
    epistemic: 0.25,
    confidence: 0.85,
    source: 'ensemble_variance',
    ...overrides,
  };
}

export function createTimeSeriesPoint(overrides?: Partial<TimeSeriesPoint>): TimeSeriesPoint {
  return {
    timestamp: Date.now(),
    value: Math.random(),
    ...overrides,
  };
}

export function createCalibrationMetrics(overrides?: Partial<CalibrationMetrics>): CalibrationMetrics {
  return {
    ece: 0.05,
    brier_score: 0.12,
    nll: 0.15,
    bins: Array.from({ length: 10 }, (_, i) => ({
      confidence: 0.95 - i * 0.1,
      accuracy: 0.9 - i * 0.05,
      count: 10,
    })),
    ...overrides,
  };
}

// ============================================================================
// Scenario Factories
// ============================================================================

export function createScenario(overrides?: Partial<Scenario>): Scenario {
  return {
    id: `scenario-${Math.random().toString(36).substring(7)}`,
    tags: { environment: 'urban', weather: 'sunny' },
    data: undefined,
    ...overrides,
  };
}

export function createMany<T>(factory: () => T, count: number): T[] {
  return Array.from({ length: count }, () => factory());
}

// ============================================================================
// Evaluation Factories
// ============================================================================

export function createEvaluationResult(overrides?: Partial<EvaluationResult>): EvaluationResult {
  return {
    scenario_id: 'scenario-1',
    metrics: {
      accuracy: 0.95,
      precision: 0.92,
      recall: 0.88,
      f1_score: 0.90,
    },
    passed: true,
    ...overrides,
  };
}

// ============================================================================
// Safety Factories
// ============================================================================

export function createMonitorOutput(overrides?: Partial<MonitorOutput>): MonitorOutput {
  return {
    monitor_id: `monitor-${Math.random().toString(36).substring(7)}`,
    triggered: false,
    severity: 0.2,
    message: 'Normal operation',
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createSafetyMarginTimeline(
  overrides?: Partial<SafetyMarginTimeline>
): SafetyMarginTimeline {
  return {
    timestamp: Date.now(),
    mitigation_state: 'nominal',
    ood_score: 0.1,
    severity: 0.2,
    constraint_margins: { speed: 0.9, distance: 0.8 },
    ...overrides,
  };
}

// ============================================================================
// Active Learning Factories
// ============================================================================

export function createSampleMetadata(overrides?: Partial<SampleMetadata>): SampleMetadata {
  return {
    id: `sample-${Math.random().toString(36).substring(7)}`,
    uncertainty: createUncertaintyEstimate(),
    novelty_score: 0.5,
    risk: {
      expected_risk: 0.3,
      tail_risk_cvar: 0.5,
      violation_probability: 0.1,
      is_acceptable: true,
    },
    embedding: undefined,
    ...overrides,
  };
}

// ============================================================================
// Visualization Data Factories
// ============================================================================

export function createUncertaintyChartData(count: number = 10): UncertaintyEstimate[] {
  return createMany(() => createUncertaintyEstimate(), count);
}

export function createSafetyTimelineData(count: number = 20): SafetyMarginTimeline[] {
  const states: Array<SafetyMarginTimeline['mitigation_state']> = [
    'nominal',
    'cautious',
    'fallback',
    'safe_stop',
  ];
  return Array.from({ length: count }, (_, i) =>
    createSafetyMarginTimeline({
      timestamp: Date.now() - (count - i) * 60000,
      mitigation_state: states[i % states.length],
      ood_score: Math.random() * 0.5,
      severity: Math.random() * 0.6,
    })
  );
}

export function createTimeSeriesData(count: number = 50): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, i) =>
    createTimeSeriesPoint({
      timestamp: Date.now() - (count - i) * 60000,
      value: Math.random(),
    })
  );
}

// ============================================================================
// Bar Chart Data Factory
// ============================================================================

export function createBarChartData(count: number = 10): Array<{ label: string; value: number; color?: string }> {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  return Array.from({ length: count }, (_, i) => ({
    label: labels[i] || `Item ${i + 1}`,
    value: Math.random() * 100,
    color: undefined,
  }));
}

// ============================================================================
// Line Chart Data Factory
// ============================================================================

export function createLineChartData(count: number = 20): Array<{ x: number; y: number; label?: string }> {
  return Array.from({ length: count }, (_, i) => ({
    x: i,
    y: Math.random() * 100,
    label: `Point ${i + 1}`,
  }));
}

export function createLineChartSeries(
  seriesCount: number = 3,
  pointsPerSeries: number = 20
): Array<{ id: string; name: string; data: Array<{ x: number; y: number; label?: string }>; color?: string }> {
  return Array.from({ length: seriesCount }, (_, i) => ({
    id: `series-${i + 1}`,
    name: `Series ${i + 1}`,
    data: createLineChartData(pointsPerSeries),
    color: undefined,
  }));
}

// ============================================================================
// Paginated Response Factory
// ============================================================================

export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): { items: T[]; total: number; page: number; page_size: number; has_more: boolean } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    total: items.length,
    page,
    page_size: pageSize,
    has_more: end < items.length,
  };
}

// ============================================================================
// Active Learning Factories (Additional)
// ============================================================================

export function createAcquisitionConfig(
  overrides: Partial<AcquisitionConfig> = {}
): AcquisitionConfig {
  return {
    weight_uncertainty: 1.0,
    weight_risk: 2.0,
    weight_novelty: 0.5,
    diversity_penalty: 0.1,
    ...overrides,
  };
}

export function createBatchSelectionResult(
  overrides: Partial<BatchSelectionResult> = {}
): BatchSelectionResult {
  const count = overrides.selected_ids?.length ?? 5;
  const ids = overrides.selected_ids ?? Array.from({ length: count }, (_, i) => `sample-${i + 1}`);

  return {
    selected_ids: ids,
    selected_indices: overrides.selected_indices ?? ids.map((_, i) => i),
    diversity_score: overrides.diversity_score ?? 0.75,
    coverage_score: overrides.coverage_score ?? 0.8,
    method: overrides.method ?? 'greedy_batch',
    ...overrides,
  };
}

// ============================================================================
// OOD Detection Factories
// ============================================================================

export function createOODResult(overrides: Partial<OODResult> = {}): OODResult {
  const isOOD = overrides.is_ood ?? Math.random() > 0.7;

  return {
    ensemble_score: overrides.ensemble_score ?? Math.random(),
    component_scores: overrides.component_scores ?? {
      mahalanobis: Math.random(),
      energy: Math.random(),
      label_shift: Math.random(),
    },
    is_ood: isOOD,
    contributing_detector: overrides.contributing_detector ?? 'mahalanobis',
    threshold: overrides.threshold ?? 0.5,
    ...overrides,
  };
}

// ============================================================================
// Safety Factories (Additional)
// ============================================================================

export function createFilteredAction(overrides: Partial<FilteredAction> = {}): FilteredAction {
  const wasModified = overrides.was_modified ?? Math.random() > 0.5;
  const fallbackUsed = overrides.fallback_used ?? (wasModified && Math.random() > 0.7);

  return {
    action: overrides.action ?? [Math.random() * 2 - 1, Math.random() * 2 - 1],
    was_modified: wasModified,
    fallback_used: fallbackUsed,
    constraint_margins: overrides.constraint_margins ?? {
      speed_limit: Math.random() * 10,
      lane_boundary: Math.random() * 2,
    },
    violation_type: overrides.violation_type ?? (wasModified ? 'soft_constraint' : undefined),
    ...overrides,
  };
}

export function createMitigationState(overrides: { state?: MitigationState } = {}): { state: MitigationState } {
  const states: MitigationState[] = ['nominal', 'cautious', 'fallback', 'safe_stop', 'human_escalation'];
  return {
    state: overrides.state ?? states[0],
  };
}

export function createRiskAssessment(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    expected_risk: 0.3,
    tail_risk_cvar: 0.5,
    violation_probability: 0.1,
    is_acceptable: true,
    ...overrides,
  };
}

export function createConformalResult(overrides: Partial<ConformalResult> = {}): ConformalResult {
  const setSize = overrides.set_size ?? 3;
  return {
    prediction_set: overrides.prediction_set ?? Array.from({ length: setSize }, (_, i) => i),
    set_size: setSize,
    coverage_probability: overrides.coverage_probability ?? 0.9,
    quantile: overrides.quantile ?? 0.95,
    is_valid: overrides.is_valid ?? true,
    message: overrides.message,
    ...overrides,
  };
}

// ============================================================================
// TLU 3D Viewer Data Factories
// ============================================================================

// Trajectory point with uncertainty
export interface TrajectoryPoint {
  position: [number, number, number];
  timestamp: number;
  confidence: number;
}

// Velocity and motion data
export interface MotionData {
  velocity: [number, number, number];
  speed: number;
  heading: number; // radians
  acceleration: [number, number, number];
}

// Time-to-collision data
export interface TTCData {
  ttc_seconds: number | null; // null if no collision predicted
  collision_point: [number, number, number] | null;
  collision_probability: number;
  target_object_id: string | null;
  interaction_type: 'merge' | 'cross' | 'follow' | 'opposing' | 'none';
}

// OOD detection result
export interface OODData {
  ood_score: number;
  is_ood: boolean;
  contributing_detector: 'mahalanobis' | 'energy' | 'label_shift' | 'ensemble';
  component_scores: {
    mahalanobis: number;
    energy: number;
    label_shift: number;
  };
  anomalous_features: string[];
}

// Conformal prediction visualization
export interface ConformalData {
  prediction_set: Array<{
    class_id: number;
    class_name: string;
    probability: number;
  }>;
  set_size: number;
  coverage_guarantee: number;
  is_singleton: boolean;
}

// Decision factor for explainability
export interface DecisionFactor {
  name: string;
  value: number;
  threshold: number;
  contribution: number; // -1 to 1, negative = toward nominal, positive = toward escalation
  unit: string;
}

export interface TLUObjectData {
  id: string;
  type: 'agent' | 'obstacle' | 'pedestrian' | 'vehicle' | 'zone';
  position: [number, number, number];
  uncertainty: UncertaintyEstimate;
  risk: RiskAssessment;
  monitor: MonitorOutput;
  label: string;
  color: string;
  // Enhanced data
  motion: MotionData;
  trajectory: TrajectoryPoint[];
  history: TrajectoryPoint[]; // Past positions
  ttc: TTCData;
  ood: OODData;
  conformal: ConformalData;
}

// TTC warning between two objects
export interface TTCWarning {
  object_a_id: string;
  object_b_id: string;
  ttc_seconds: number;
  collision_point: [number, number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TLUSceneData {
  objects: TLUObjectData[];
  globalState: {
    mitigation_state: MitigationState;
    overall_uncertainty: UncertaintyEstimate;
    overall_risk: RiskAssessment;
    active_monitors: MonitorOutput[];
    timestamp: number;
    // Enhanced state
    decision_factors: DecisionFactor[];
    ood_status: {
      any_ood: boolean;
      max_ood_score: number;
      ood_object_ids: string[];
    };
  };
  timeline: SafetyMarginTimeline[];
  ttc_warnings: TTCWarning[];
  playback: {
    current_time: number;
    start_time: number;
    end_time: number;
    is_live: boolean;
    playback_speed: number;
  };
}

// Helper to generate trajectory points
function generateTrajectory(
  startPos: [number, number, number],
  velocity: [number, number, number],
  count: number,
  timeStep: number = 500, // ms between points
  uncertaintyGrowth: number = 0.05
): TrajectoryPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) * timeStep / 1000; // seconds
    return {
      position: [
        startPos[0] + velocity[0] * t,
        startPos[1],
        startPos[2] + velocity[2] * t,
      ] as [number, number, number],
      timestamp: now + (i + 1) * timeStep,
      confidence: Math.max(0.3, 1 - uncertaintyGrowth * (i + 1)),
    };
  });
}

// Helper to generate history trail
function generateHistory(
  currentPos: [number, number, number],
  velocity: [number, number, number],
  count: number,
  timeStep: number = 200
): TrajectoryPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = (count - i) * timeStep / 1000;
    return {
      position: [
        currentPos[0] - velocity[0] * t,
        currentPos[1],
        currentPos[2] - velocity[2] * t,
      ] as [number, number, number],
      timestamp: now - (count - i) * timeStep,
      confidence: 1.0, // History is certain
    };
  });
}

export function createTLUObject(overrides: Partial<TLUObjectData> = {}): TLUObjectData {
  const types: TLUObjectData['type'][] = ['agent', 'obstacle', 'pedestrian', 'vehicle', 'zone'];
  const type = overrides.type ?? types[Math.floor(Math.random() * types.length)];

  const colorMap: Record<TLUObjectData['type'], string> = {
    agent: '#3b82f6',      // blue - ego vehicle
    vehicle: '#22c55e',    // green - other vehicles
    pedestrian: '#f59e0b', // orange - pedestrians
    obstacle: '#ef4444',   // red - obstacles
    zone: '#8b5cf6',       // purple - zones
  };

  const labelMap: Record<TLUObjectData['type'], string> = {
    agent: 'Ego Vehicle',
    vehicle: 'Vehicle',
    pedestrian: 'Pedestrian',
    obstacle: 'Obstacle',
    zone: 'Safety Zone',
  };

  const classNames: Record<TLUObjectData['type'], string[]> = {
    agent: ['ego_vehicle'],
    vehicle: ['car', 'truck', 'bus', 'motorcycle'],
    pedestrian: ['pedestrian', 'cyclist', 'scooter'],
    obstacle: ['barrier', 'cone', 'debris', 'unknown'],
    zone: ['safe_zone', 'caution_zone'],
  };

  const position: [number, number, number] = overrides.position ?? [
    (Math.random() - 0.5) * 10,
    type === 'zone' ? 0.05 : 0.3 + Math.random() * 0.4,
    (Math.random() - 0.5) * 10,
  ];

  // Generate velocity based on object type
  const speedMap: Record<TLUObjectData['type'], number> = {
    agent: 8 + Math.random() * 4, // 8-12 m/s
    vehicle: 5 + Math.random() * 10, // 5-15 m/s
    pedestrian: 0.5 + Math.random() * 1.5, // 0.5-2 m/s
    obstacle: 0,
    zone: 0,
  };

  const speed = speedMap[type];
  const heading = Math.random() * Math.PI * 2;
  const velocity: [number, number, number] = [
    Math.cos(heading) * speed,
    0,
    Math.sin(heading) * speed,
  ];

  const oodScore = Math.random() * 0.4; // Most objects in-distribution
  const isOOD = oodScore > 0.3;

  // Generate conformal prediction set
  const possibleClasses = classNames[type];
  const setSize = 1 + Math.floor(Math.random() * Math.min(3, possibleClasses.length));
  const predictionSet = possibleClasses.slice(0, setSize).map((name, i) => ({
    class_id: i,
    class_name: name,
    probability: i === 0 ? 0.7 + Math.random() * 0.25 : Math.random() * 0.3,
  }));

  return {
    id: overrides.id ?? `obj-${Math.random().toString(36).substring(7)}`,
    type,
    position,
    uncertainty: overrides.uncertainty ?? createUncertaintyEstimate({
      confidence: 0.5 + Math.random() * 0.5,
      aleatoric_score: Math.random() * 0.3,
      epistemic_score: Math.random() * 0.4,
    }),
    risk: overrides.risk ?? createRiskAssessment({
      expected_risk: Math.random() * 0.5,
      is_acceptable: Math.random() > 0.3,
    }),
    monitor: overrides.monitor ?? createMonitorOutput({
      triggered: Math.random() > 0.7,
      severity: Math.random(),
    }),
    label: overrides.label ?? labelMap[type],
    color: overrides.color ?? colorMap[type],
    // Enhanced motion data
    motion: overrides.motion ?? {
      velocity,
      speed,
      heading,
      acceleration: [
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2,
      ],
    },
    // Predicted trajectory (next 3 seconds, 6 points)
    trajectory: overrides.trajectory ?? (type !== 'obstacle' && type !== 'zone'
      ? generateTrajectory(position, velocity, 6, 500)
      : []),
    // History trail (last 1.5 seconds, 8 points)
    history: overrides.history ?? (type !== 'obstacle' && type !== 'zone'
      ? generateHistory(position, velocity, 8, 200)
      : []),
    // TTC data (will be computed based on scene)
    ttc: overrides.ttc ?? {
      ttc_seconds: null,
      collision_point: null,
      collision_probability: 0,
      target_object_id: null,
      interaction_type: 'none',
    },
    // OOD detection
    ood: overrides.ood ?? {
      ood_score: oodScore,
      is_ood: isOOD,
      contributing_detector: isOOD ? 'mahalanobis' : 'ensemble',
      component_scores: {
        mahalanobis: oodScore + (Math.random() - 0.5) * 0.1,
        energy: oodScore + (Math.random() - 0.5) * 0.1,
        label_shift: oodScore + (Math.random() - 0.5) * 0.1,
      },
      anomalous_features: isOOD ? ['appearance', 'motion_pattern'] : [],
    },
    // Conformal prediction
    conformal: overrides.conformal ?? {
      prediction_set: predictionSet,
      set_size: setSize,
      coverage_guarantee: 0.9,
      is_singleton: setSize === 1,
    },
  };
}

// Create decision factors for explainability
export function createDecisionFactors(state: MitigationState): DecisionFactor[] {
  const baseFactors: DecisionFactor[] = [
    {
      name: 'Min TTC',
      value: state === 'nominal' ? 4.5 : state === 'cautious' ? 2.8 : 1.2,
      threshold: 3.0,
      contribution: state === 'nominal' ? -0.3 : state === 'cautious' ? 0.4 : 0.8,
      unit: 's',
    },
    {
      name: 'Max Uncertainty',
      value: state === 'nominal' ? 0.15 : state === 'cautious' ? 0.35 : 0.55,
      threshold: 0.4,
      contribution: state === 'nominal' ? -0.2 : state === 'cautious' ? 0.3 : 0.7,
      unit: '',
    },
    {
      name: 'OOD Score',
      value: state === 'nominal' ? 0.08 : state === 'cautious' ? 0.22 : 0.45,
      threshold: 0.3,
      contribution: state === 'nominal' ? -0.1 : state === 'cautious' ? 0.2 : 0.6,
      unit: '',
    },
    {
      name: 'Min Clearance',
      value: state === 'nominal' ? 3.2 : state === 'cautious' ? 1.8 : 0.9,
      threshold: 1.5,
      contribution: state === 'nominal' ? -0.25 : state === 'cautious' ? 0.35 : 0.75,
      unit: 'm',
    },
    {
      name: 'Triggered Monitors',
      value: state === 'nominal' ? 0 : state === 'cautious' ? 2 : 4,
      threshold: 2,
      contribution: state === 'nominal' ? -0.15 : state === 'cautious' ? 0.25 : 0.65,
      unit: '',
    },
  ];
  return baseFactors;
}

export function createTLUSceneData(objectCount: number = 6): TLUSceneData {
  const states: MitigationState[] = ['nominal', 'cautious', 'fallback', 'safe_stop'];
  const currentState = states[Math.floor(Math.random() * states.length)];
  const now = Date.now();

  // Create ego vehicle at center moving forward
  const egoVehicle = createTLUObject({
    id: 'ego-vehicle',
    type: 'agent',
    position: [0, 0.5, 0],
    label: 'Ego Vehicle',
    uncertainty: createUncertaintyEstimate({ confidence: 0.92 }),
    risk: createRiskAssessment({ expected_risk: 0.15, is_acceptable: true }),
    monitor: createMonitorOutput({ triggered: false, severity: 0.1 }),
    motion: {
      velocity: [0, 0, 8], // Moving forward (positive Z)
      speed: 8,
      heading: Math.PI / 2,
      acceleration: [0, 0, 0.5],
    },
  });

  // Create other objects around
  const otherObjects = Array.from({ length: objectCount - 1 }, (_, i) => {
    const angle = (i / (objectCount - 1)) * Math.PI * 2;
    const radius = 3 + Math.random() * 4;
    const objType = i === 0 ? 'pedestrian' : i === 1 ? 'vehicle' : (['vehicle', 'pedestrian', 'obstacle'] as const)[Math.floor(Math.random() * 3)];

    return createTLUObject({
      id: `object-${i}`,
      type: objType,
      position: [
        Math.cos(angle) * radius,
        objType === 'pedestrian' ? 0.3 : 0.4,
        Math.sin(angle) * radius + 3, // Offset forward
      ],
    });
  });

  const allObjects = [egoVehicle, ...otherObjects];

  // Generate TTC warnings for close objects
  const ttcWarnings: TTCWarning[] = [];
  for (const obj of otherObjects) {
    const dist = Math.sqrt(
      Math.pow(obj.position[0] - egoVehicle.position[0], 2) +
      Math.pow(obj.position[2] - egoVehicle.position[2], 2)
    );
    if (dist < 6 && obj.type !== 'obstacle') {
      const ttc = dist / 8 + Math.random() * 2; // Rough TTC estimate
      if (ttc < 5) {
        ttcWarnings.push({
          object_a_id: 'ego-vehicle',
          object_b_id: obj.id,
          ttc_seconds: ttc,
          collision_point: [
            (egoVehicle.position[0] + obj.position[0]) / 2,
            0.3,
            (egoVehicle.position[2] + obj.position[2]) / 2 + 2,
          ],
          severity: ttc < 2 ? 'critical' : ttc < 3 ? 'high' : ttc < 4 ? 'medium' : 'low',
        });

        // Update the object's TTC data
        obj.ttc = {
          ttc_seconds: ttc,
          collision_point: ttcWarnings[ttcWarnings.length - 1].collision_point,
          collision_probability: Math.max(0.3, 1 - ttc / 5),
          target_object_id: 'ego-vehicle',
          interaction_type: obj.type === 'pedestrian' ? 'cross' : 'follow',
        };
      }
    }
  }

  // Find OOD objects
  const oodObjectIds = allObjects.filter(o => o.ood.is_ood).map(o => o.id);
  const maxOodScore = Math.max(...allObjects.map(o => o.ood.ood_score));

  return {
    objects: allObjects,
    globalState: {
      mitigation_state: currentState,
      overall_uncertainty: createUncertaintyEstimate(),
      overall_risk: createRiskAssessment(),
      active_monitors: createMany(createMonitorOutput, 4),
      timestamp: now,
      decision_factors: createDecisionFactors(currentState),
      ood_status: {
        any_ood: oodObjectIds.length > 0,
        max_ood_score: maxOodScore,
        ood_object_ids: oodObjectIds,
      },
    },
    timeline: createSafetyTimelineData(30),
    ttc_warnings: ttcWarnings,
    playback: {
      current_time: now,
      start_time: now - 30000, // 30 seconds of history
      end_time: now,
      is_live: true,
      playback_speed: 1.0,
    },
  };
}

// ============================================================================
// Dashboard Mock Data Factories
// ============================================================================

export interface DashboardMetrics {
  uncertaintyTrend: TimeSeriesPoint[];
  riskTrend: TimeSeriesPoint[];
  calibrationHistory: CalibrationMetrics[];
  scenarioResults: Array<{
    scenario: Scenario;
    result: EvaluationResult;
  }>;
  activeLearningQueue: SampleMetadata[];
  systemHealth: {
    uptime: number;
    requestsPerMinute: number;
    avgLatencyMs: number;
    errorRate: number;
  };
}

export function createDashboardMetrics(): DashboardMetrics {
  return {
    uncertaintyTrend: Array.from({ length: 60 }, (_, i) => ({
      timestamp: Date.now() - (60 - i) * 60000,
      value: 0.2 + Math.sin(i / 10) * 0.1 + Math.random() * 0.1,
    })),
    riskTrend: Array.from({ length: 60 }, (_, i) => ({
      timestamp: Date.now() - (60 - i) * 60000,
      value: 0.15 + Math.cos(i / 15) * 0.08 + Math.random() * 0.05,
    })),
    calibrationHistory: Array.from({ length: 10 }, () => createCalibrationMetrics()),
    scenarioResults: Array.from({ length: 20 }, () => ({
      scenario: createScenario(),
      result: createEvaluationResult(),
    })),
    activeLearningQueue: createMany(createSampleMetadata, 15),
    systemHealth: {
      uptime: 99.95,
      requestsPerMinute: 1250 + Math.floor(Math.random() * 500),
      avgLatencyMs: 45 + Math.floor(Math.random() * 20),
      errorRate: 0.02 + Math.random() * 0.03,
    },
  };
}

// ============================================================================
// Real-time Simulation Factories
// ============================================================================

export function createRealtimeUpdate(): {
  uncertainty: UncertaintyEstimate;
  monitors: MonitorOutput[];
  mitigationState: MitigationState;
  timestamp: number;
} {
  const states: MitigationState[] = ['nominal', 'cautious', 'fallback'];
  return {
    uncertainty: createUncertaintyEstimate({
      confidence: 0.7 + Math.random() * 0.25,
      aleatoric_score: 0.05 + Math.random() * 0.2,
      epistemic_score: 0.1 + Math.random() * 0.25,
    }),
    monitors: createMany(createMonitorOutput, 4),
    mitigationState: states[Math.floor(Math.random() * states.length)],
    timestamp: Date.now(),
  };
}
