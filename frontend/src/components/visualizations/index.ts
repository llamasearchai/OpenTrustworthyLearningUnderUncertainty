/**
 * Visualization Components Index
 *
 * Central export point for all visualization components including
 * charts, KPI cards, and domain-specific visualizations for OpenTLU.
 *
 * @module components/visualizations
 */

// ============================================================================
// Core Charts
// ============================================================================

// Line Chart - Multi-series time series with compound components
export { LineChart } from './charts/line-chart';
export type { LineChartDataPoint, LineChartSeries, CurveType } from './charts/line-chart';

// Bar Chart - Vertical/horizontal with stacking and animations
export { BarChart } from './charts/bar-chart';
export type { BarChartDataPoint } from './charts/bar-chart';

// ============================================================================
// OpenTLU-Specific Visualizations
// ============================================================================

// Uncertainty Chart - Aleatoric/epistemic decomposition
// Variants: bar, gauge, pie, donut, decomposition
export { UncertaintyChart } from './uncertainty-chart';

// Calibration Chart - Reliability diagram with ECE
// Shows calibration curve, perfect diagonal, histogram bins
export { CalibrationChart } from './calibration-chart';

// Safety Timeline Chart - Multi-line safety margins
// Features: mitigation state bands, constraint lines, OOD score
export { SafetyTimelineChart } from './safety-timeline-chart';

// ============================================================================
// KPI Components
// ============================================================================

// KPI Card - Enhanced with sparkline and trends
export { KPICard, KPIGrid } from './kpi-card';

// ============================================================================
// Type Re-exports
// ============================================================================

export type {
  // Chart props from types/components
  LineChartProps,
  BarChartProps,
  UncertaintyChartProps,
  CalibrationChartProps,
  SafetyTimelineProps,
  KPICardProps,
} from '@/types/components';
