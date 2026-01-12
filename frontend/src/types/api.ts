/**
 * API Type Definitions for OpenTLU Backend
 * 
 * Purpose: Complete TypeScript interfaces for all API request/response payloads,
 * extracted from the OpenTLU Python backend data contracts and models.
 * 
 * Architecture fit: Central type definitions ensure type safety across
 * all API interactions, form validations, and state management.
 * 
 * @module types/api
 */

// ============================================================================
// Uncertainty Types - Maps to opentlu.foundations.contracts
// ============================================================================

/**
 * Types of uncertainty in learning-based models
 * Maps to Python UncertaintyType enum
 */
export type UncertaintyType = 'aleatoric' | 'epistemic';

/**
 * Operational states for the runtime mitigation controller
 * Maps to Python MitigationState enum
 */
export type MitigationState = 
  | 'nominal' 
  | 'cautious' 
  | 'fallback' 
  | 'safe_stop' 
  | 'human_escalation';

/**
 * Standardized output for model uncertainty
 * Maps to Python UncertaintyEstimate model
 */
export interface UncertaintyEstimate {
  /** Overall model confidence (0.0 to 1.0) */
  confidence: number;
  /** Estimate of irreducible noise (≥0.0) */
  aleatoric_score: number;
  /** Estimate of knowledge gap (≥0.0) */
  epistemic_score: number;
  /** Method used for estimation, e.g., 'ensemble_variance' */
  source: string;
  /** Size of conformal prediction set (≥0) */
  conformal_set_size?: number;
  /** Target coverage probability for conformal set (0.0 to 1.0) */
  coverage_probability?: number;
  /** Conformal prediction set (class indices) */
  prediction_set?: number[];
}

/**
 * Operational risk profile for a candidate action
 * Maps to Python RiskAssessment model
 */
export interface RiskAssessment {
  /** Expected risk value (≥0.0) */
  expected_risk: number;
  /** Conditional Value at Risk - tail risk (≥0.0) */
  tail_risk_cvar: number;
  /** Probability of constraint violation (0.0 to 1.0) */
  violation_probability: number;
  /** Whether the risk is within safety acceptance bounds */
  is_acceptable: boolean;
}

/**
 * Safety constraints that must be respected by the LBM
 * Maps to Python SafetyEnvelope model
 */
export interface SafetyEnvelope {
  /** Constraints that cannot be violated */
  hard_constraints: string[];
  /** Constraints that should be minimized */
  soft_constraints: string[];
  /** Max allowed probability of violation (0.0 to 1.0) */
  violation_threshold: number;
}

/**
 * Output from a runtime safety monitor
 * Maps to Python MonitorOutput model
 */
export interface MonitorOutput {
  /** Unique identifier for the monitor */
  monitor_id: string;
  /** Whether the monitor was triggered */
  triggered: boolean;
  /** Severity level (0.0 to 1.0) */
  severity: number;
  /** Human-readable message */
  message: string;
  /** Unix timestamp */
  timestamp: number;
}

// ============================================================================
// Conformal Prediction Types - Maps to opentlu.foundations.conformal
// ============================================================================

/**
 * Configuration for conformal prediction
 * Maps to Python ConformalConfig
 */
export interface ConformalConfig {
  /** Target coverage probability (e.g., 0.9 = 90%) */
  coverage: number;
  /** Minimum samples for valid calibration */
  min_calibration_size: number;
  /** Clip extreme nonconformity scores at this percentile */
  score_clip_percentile: number;
}

/**
 * Result from conformal prediction
 * Maps to Python ConformalResult
 */
export interface ConformalResult {
  /** Set of class indices in the prediction set */
  prediction_set: number[];
  /** Size of the prediction set */
  set_size: number;
  /** Target coverage probability used */
  coverage_probability: number;
  /** Nonconformity quantile threshold */
  quantile: number;
  /** Whether calibration was valid */
  is_valid: boolean;
  /** Optional message (e.g., error description) */
  message?: string;
}

/**
 * Stored calibration data for conformal prediction
 * Maps to Python CalibrationData
 */
export interface CalibrationData {
  /** Unique calibration identifier */
  calibration_id: string;
  /** Computed quantile threshold */
  quantile: number;
  /** Target coverage used */
  coverage: number;
  /** Number of calibration samples */
  n_samples: number;
  /** Method used (e.g., 'split_conformal') */
  method: string;
  /** Class-specific quantiles for mondrian conformal */
  class_quantiles?: Record<number, number>;
  /** Creation timestamp */
  created_at: number;
}

// ============================================================================
// OOD Detection Types - Maps to opentlu.runtime.ood
// ============================================================================

/**
 * Result from OOD detection
 * Maps to Python OODResult
 */
export interface OODResult {
  /** Combined score from all detectors */
  ensemble_score: number;
  /** Individual detector scores */
  component_scores: Record<string, number>;
  /** Whether classified as OOD */
  is_ood: boolean;
  /** Detector most responsible for OOD detection */
  contributing_detector: string;
  /** Threshold used for classification */
  threshold: number;
}

/**
 * OOD detector types available in the system
 */
export type OODDetectorType = 
  | 'mahalanobis' 
  | 'energy' 
  | 'label_shift' 
  | 'ensemble';

// ============================================================================
// Evaluation Types - Maps to opentlu.evaluation.engine
// ============================================================================

/**
 * Evaluation scenario definition
 * Maps to Python Scenario
 */
export interface Scenario {
  /** Unique scenario identifier */
  id: string;
  /** Scenario tags (e.g., {"lighting": "night", "density": "high"}) */
  tags: Record<string, string>;
  /** Scenario data (flexible type) */
  data?: unknown;
}

/**
 * Result from evaluating a single scenario
 * Maps to Python EvaluationResult
 */
export interface EvaluationResult {
  /** ID of the evaluated scenario */
  scenario_id: string;
  /** Computed metrics */
  metrics: Record<string, number>;
  /** Whether the scenario passed acceptance criteria */
  passed: boolean;
}

/**
 * Aggregated evaluation results
 */
export interface AggregatedResults {
  /** Total number of scenarios evaluated */
  total_scenarios: number;
  /** Pass rate (0.0 to 1.0) */
  pass_rate: number;
  /** Mean values for each metric */
  mean_metrics: Record<string, number>;
}

// ============================================================================
// Active Learning Types - Maps to opentlu.active_learning.acquisition
// ============================================================================

/**
 * Metadata for a sample in active learning
 * Maps to Python SampleMetadata
 */
export interface SampleMetadata {
  /** Sample identifier */
  id: string;
  /** Uncertainty estimate for the sample */
  uncertainty: UncertaintyEstimate;
  /** Risk assessment for the sample */
  risk: RiskAssessment;
  /** Novelty score for diversity */
  novelty_score: number;
  /** Optional embedding for diversity calculations */
  embedding?: number[];
}

/**
 * Configuration for acquisition function
 * Maps to Python AcquisitionConfig
 */
export interface AcquisitionConfig {
  /** Weight for uncertainty term */
  weight_uncertainty: number;
  /** Weight for risk term */
  weight_risk: number;
  /** Weight for novelty term */
  weight_novelty: number;
  /** Penalty for lack of diversity */
  diversity_penalty: number;
}

/**
 * Result from batch selection with diversity
 * Maps to Python BatchSelectionResult
 */
export interface BatchSelectionResult {
  /** IDs of selected samples */
  selected_ids: string[];
  /** Indices of selected samples */
  selected_indices: number[];
  /** Diversity score (determinant or other metric) */
  diversity_score: number;
  /** Embedding space coverage score */
  coverage_score: number;
  /** Selection method used */
  method: string;
}

// ============================================================================
// Safety Monitor Types - Maps to opentlu.safety.monitors
// ============================================================================

/**
 * Configuration for Time-to-Collision monitor
 * Maps to Python TTCConfig
 */
export interface TTCConfig {
  /** Critical TTC in seconds - triggers SAFE_STOP */
  critical_ttc: number;
  /** Warning TTC in seconds - triggers severity scaling */
  warning_ttc: number;
  /** TTC model type */
  model: 'constant_velocity' | 'constant_acceleration';
  /** Hysteresis steps for rapid oscillation prevention */
  debounce_steps: number;
  /** Minimum closing velocity to consider */
  min_closing_velocity: number;
}

/**
 * Tracked object for TTC computation
 * Maps to Python TrackedObject
 */
export interface TrackedObject {
  /** Object identifier */
  object_id: string;
  /** Position vector (2D or 3D) */
  position: number[];
  /** Velocity vector (2D or 3D) */
  velocity: number[];
  /** Optional acceleration vector */
  acceleration?: number[];
}

// ============================================================================
// Safety Filter Types - Maps to opentlu.safety.filter
// ============================================================================

/**
 * Result from safety filtering
 * Maps to Python FilteredAction
 */
export interface FilteredAction {
  /** The (possibly modified) safe action */
  action: number[];
  /** Whether the action was modified */
  was_modified: boolean;
  /** Margin to each constraint (positive = safe) */
  constraint_margins: Record<string, number>;
  /** Whether fallback action was used */
  fallback_used: boolean;
  /** Type of constraint violated (if any) */
  violation_type?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Request ID for tracing */
  request_id?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Response data items */
  items: T[];
  /** Total number of items */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  page_size: number;
  /** Whether there are more pages */
  has_more: boolean;
}

/**
 * WebSocket message types for real-time updates
 */
export type WebSocketMessageType = 
  | 'uncertainty_update'
  | 'monitor_alert'
  | 'state_change'
  | 'evaluation_progress'
  | 'ood_detection';

/**
 * WebSocket message wrapper
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type */
  type: WebSocketMessageType;
  /** Message payload */
  payload: T;
  /** Message timestamp */
  timestamp: number;
  /** Optional sequence number */
  sequence?: number;
}

// ============================================================================
// Metrics Types - For dashboard visualizations
// ============================================================================

/**
 * Time series data point for visualizations
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  timestamp: number;
  /** Value at this timestamp */
  value: number;
  /** Optional label */
  label?: string;
}

/**
 * Uncertainty decomposition data for visualization
 */
export interface UncertaintyDecomposition {
  /** Total uncertainty */
  total: number;
  /** Aleatoric (data) uncertainty */
  aleatoric: number;
  /** Epistemic (model) uncertainty */
  epistemic: number;
  /** Confidence score */
  confidence: number;
  /** Estimation source/method */
  source: string;
}

/**
 * Calibration metrics for visualization
 */
export interface CalibrationMetrics {
  /** Expected Calibration Error */
  ece: number;
  /** Brier score */
  brier_score: number;
  /** Negative log likelihood */
  nll: number;
  /** Bin data for reliability diagram */
  bins: Array<{
    confidence: number;
    accuracy: number;
    count: number;
  }>;
}

/**
 * Safety margin timeline data
 */
export interface SafetyMarginTimeline {
  /** Timestamp */
  timestamp: number;
  /** Current mitigation state */
  mitigation_state: MitigationState;
  /** Constraint margins (constraint name -> margin value) */
  constraint_margins: Record<string, number>;
  /** OOD score at this time */
  ood_score: number;
  /** Monitor severity at this time */
  severity: number;
}
