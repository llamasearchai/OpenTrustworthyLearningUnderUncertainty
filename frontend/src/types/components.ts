/**
 * Component Type Definitions for OpenTLU Frontend
 * 
 * Purpose: Comprehensive TypeScript interfaces for all UI component props,
 * 3D scene components, and visualization components with JSDoc documentation.
 * 
 * Architecture fit: Central component type definitions ensure consistency
 * across the component library and enable proper IDE autocomplete/validation.
 * 
 * @module types/components
 */

import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { MitigationState, UncertaintyEstimate, SafetyMarginTimeline } from './api';

// ============================================================================
// Base Component Types
// ============================================================================

/**
 * Common props shared across all components
 */
export interface BaseComponentProps {
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing-library queries */
  'data-testid'?: string;
}

/**
 * Props for components that can have children
 */
export interface WithChildren {
  children?: ReactNode;
}

/**
 * Props for components with loading states
 */
export interface WithLoading {
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Loading indicator text for screen readers */
  loadingText?: string;
}

/**
 * Props for components with error states
 */
export interface WithError {
  /** Whether the component is in an error state */
  isError?: boolean;
  /** Error message to display */
  errorMessage?: string;
}

/**
 * Props for components with disabled states
 */
export interface WithDisabled {
  /** Whether the component is disabled */
  disabled?: boolean;
}

// ============================================================================
// Atom Components - Basic UI Elements
// ============================================================================

/**
 * Button component variants
 */
export type ButtonVariant = 
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

/**
 * Button component sizes
 */
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Button component props
 * @see src/components/ui/button.tsx
 */
export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    BaseComponentProps,
    WithLoading,
    WithDisabled {
  /** Button visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Icon to display on the left */
  leftIcon?: ReactNode;
  /** Icon to display on the right */
  rightIcon?: ReactNode;
  /** Render as child element (for Radix composition) */
  asChild?: boolean;
}

/**
 * Input component types
 */
export type InputType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'search'
  | 'tel'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime-local';

/**
 * Input component props
 * @see src/components/ui/input.tsx
 */
export interface InputProps 
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    BaseComponentProps,
    WithError,
    WithDisabled {
  /** Input type */
  type?: InputType;
  /** Prefix element (e.g., icon or text) */
  prefix?: ReactNode;
  /** Suffix element (e.g., icon or button) */
  suffix?: ReactNode;
  /** Input size variant */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Label component props
 * @see src/components/ui/label.tsx
 */
export interface LabelProps 
  extends HTMLAttributes<HTMLLabelElement>,
    BaseComponentProps {
  /** Associated input ID */
  htmlFor?: string;
  /** Whether the associated field is required */
  required?: boolean;
}

/**
 * Badge variants
 */
export type BadgeVariant = 
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

/**
 * Badge component props
 * @see src/components/ui/badge.tsx
 */
export interface BadgeProps 
  extends HTMLAttributes<HTMLDivElement>,
    BaseComponentProps {
  /** Badge visual variant */
  variant?: BadgeVariant;
}

/**
 * Avatar component props
 * @see src/components/ui/avatar.tsx
 */
export interface AvatarProps extends BaseComponentProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Fallback initials when image fails to load */
  fallback?: string;
  /** Avatar size */
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

/**
 * Tooltip component props
 * @see src/components/ui/tooltip.tsx
 */
export interface TooltipProps extends BaseComponentProps, WithChildren {
  /** Tooltip content */
  content: ReactNode;
  /** Preferred placement side */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Delay before showing (ms) */
  delayDuration?: number;
}

/**
 * Skeleton component props for loading states
 * @see src/components/ui/skeleton.tsx
 */
export interface SkeletonProps extends BaseComponentProps {
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Whether to show as a circle */
  circle?: boolean;
  /** Number of skeleton lines to render */
  count?: number;
}

// ============================================================================
// Molecule Components - Composed UI Elements
// ============================================================================

/**
 * FormField component props (label + input + error composition)
 * @see src/components/common/form-field.tsx
 */
export interface FormFieldProps extends BaseComponentProps, WithChildren {
  /** Field label */
  label: string;
  /** Field name (for form integration) */
  name: string;
  /** Field description/help text */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
}

/**
 * Card component props
 * @see src/components/common/card.tsx
 */
export interface CardProps 
  extends HTMLAttributes<HTMLDivElement>,
    BaseComponentProps,
    WithChildren {
  /** Card padding size */
  padding?: 'none' | 'sm' | 'default' | 'lg';
  /** Whether to show a border */
  bordered?: boolean;
  /** Whether the card is interactive (hoverable) */
  interactive?: boolean;
}

/**
 * Alert variants
 */
export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

/**
 * Alert component props
 * @see src/components/common/alert.tsx
 */
export interface AlertProps 
  extends HTMLAttributes<HTMLDivElement>,
    BaseComponentProps,
    WithChildren {
  /** Alert variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Icon to display */
  icon?: ReactNode;
}

/**
 * Modal/Dialog component props
 * @see src/components/common/modal.tsx
 */
export interface ModalProps extends BaseComponentProps, WithChildren {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal size */
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
  /** Whether to show close button */
  showClose?: boolean;
  /** Whether clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
}

/**
 * Toast notification props
 */
export interface ToastProps {
  /** Toast ID */
  id?: string;
  /** Toast title */
  title?: string;
  /** Toast description/message */
  description?: string;
  /** Toast variant */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Duration in milliseconds (0 for persistent) */
  duration?: number;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Tabs component props
 * @see src/components/common/tabs.tsx
 */
export interface TabsProps extends BaseComponentProps {
  /** Tab definitions */
  tabs: Array<{
    value: string;
    label: string;
    content: ReactNode;
    disabled?: boolean;
    icon?: ReactNode;
  }>;
  /** Default selected tab value */
  defaultValue?: string;
  /** Controlled selected value */
  value?: string;
  /** Callback when tab changes */
  onValueChange?: (value: string) => void;
  /** Tab list orientation */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Pagination component props
 * @see src/components/common/pagination.tsx
 */
export interface PaginationProps extends BaseComponentProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Number of page buttons to show */
  siblingCount?: number;
  /** Whether to show first/last buttons */
  showFirstLast?: boolean;
  /** Whether to show page size selector */
  showPageSize?: boolean;
  /** Current page size */
  pageSize?: number;
  /** Available page sizes */
  pageSizes?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
}

// ============================================================================
// Organism Components - Feature-Level UI
// ============================================================================

/**
 * Filter types supported by DataTable columns
 */
export type DataTableFilterType = 'text' | 'select' | 'date-range' | 'number-range';

/**
 * Column alignment options
 */
export type DataTableColumnAlign = 'left' | 'center' | 'right';

/**
 * Selection mode options
 */
export type DataTableSelectionMode = 'single' | 'multiple' | 'none';

/**
 * Sort order options
 */
export type DataTableSortOrder = 'asc' | 'desc';

/**
 * DataTable column definition
 * @see src/components/features/data-table.tsx
 */
export interface DataTableColumn<T> {
  /** Column key (must match data property) */
  key: keyof T | string;
  /** Column header label or render function */
  header: string | ((column: { isSorted: boolean; sortDirection?: DataTableSortOrder }) => ReactNode);
  /** Custom cell renderer */
  cell?: (value: T[keyof T], row: T, rowIndex: number) => ReactNode;
  /** Whether column is sortable (default: true) */
  sortable?: boolean;
  /** Whether column is filterable */
  filterable?: boolean;
  /** Filter type for column-specific filtering */
  filterType?: DataTableFilterType;
  /** Filter options for 'select' filter type */
  filterOptions?: Array<{ label: string; value: string }>;
  /** Column width (CSS value) */
  width?: string | number;
  /** Minimum column width (CSS value) */
  minWidth?: string | number;
  /** Text alignment */
  align?: DataTableColumnAlign;
  /** Whether column is sticky (horizontal scroll) */
  sticky?: boolean;
  /** Whether column is hidden by default */
  hidden?: boolean;
  /** Whether column is visible by default (deprecated, use hidden) */
  defaultVisible?: boolean;
  /** Custom sort function */
  sortFn?: (rowA: T, rowB: T, columnKey: string) => number;
  /** Custom filter function */
  filterFn?: (row: T, columnKey: string, filterValue: unknown) => boolean;
}

/**
 * Pagination configuration for DataTable
 */
export interface DataTablePaginationConfig {
  /** Current page (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Available page size options (default: [10, 20, 50, 100]) */
  pageSizeOptions?: number[];
}

/**
 * Column filter value types
 */
export type DateRangeFilterValue = { from?: Date; to?: Date };
export type NumberRangeFilterValue = { min?: number; max?: number };
export type ColumnFilterValue = string | string[] | DateRangeFilterValue | NumberRangeFilterValue;

/**
 * Column filters map
 */
export type DataTableColumnFilters = Record<string, ColumnFilterValue>;

/**
 * DataTable component props
 * @see src/components/features/data-table.tsx
 */
export interface DataTableProps<T extends Record<string, unknown>>
  extends BaseComponentProps,
    WithLoading,
    WithError {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row key extractor */
  getRowKey: (row: T) => string | number;

  // Sorting
  /** Single-column sort configuration (controlled) */
  sortBy?: string;
  /** Sort order for single-column sort */
  sortOrder?: DataTableSortOrder;
  /** Callback when sort changes */
  onSortChange?: (sortBy: string, sortOrder: DataTableSortOrder) => void;
  /** Enable multi-column sorting */
  multiSort?: boolean;
  /** Multi-column sorting state (controlled) */
  sorting?: Array<{ id: string; desc: boolean }>;
  /** Callback when multi-sort changes */
  onMultiSortChange?: (sorting: Array<{ id: string; desc: boolean }>) => void;

  // Filtering
  /** Global search value (controlled) */
  globalFilter?: string;
  /** Callback when global search changes */
  onGlobalFilterChange?: (value: string) => void;
  /** Global search debounce delay in ms (default: 300) */
  globalFilterDebounce?: number;
  /** Column filters (controlled) */
  columnFilters?: DataTableColumnFilters;
  /** Callback when column filters change */
  onFilterChange?: (filters: DataTableColumnFilters) => void;

  // Pagination
  /** Pagination configuration */
  pagination?: DataTablePaginationConfig;

  // Selection
  /** Selection mode */
  selectionMode?: DataTableSelectionMode;
  /** Selected row keys */
  selectedKeys?: Set<string | number>;
  /** Callback when selection changes */
  onSelectionChange?: (keys: Set<string | number>) => void;

  // Row Expansion
  /** Expanded row keys (controlled) */
  expandedKeys?: Set<string | number>;
  /** Callback when expansion changes */
  onExpansionChange?: (keys: Set<string | number>) => void;
  /** Render function for expanded row content */
  renderExpandedRow?: (row: T) => ReactNode;

  // States
  /** Number of skeleton rows to show when loading (default: 5) */
  loadingRowCount?: number;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Custom empty state component */
  emptyState?: ReactNode;
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;

  // Column Visibility
  /** localStorage key for persisting column visibility */
  columnVisibilityStorageKey?: string;
  /** Initial column visibility state */
  defaultColumnVisibility?: Record<string, boolean>;

  // Export
  /** Enable export functionality */
  enableExport?: boolean;
  /** Custom export filename (without extension) */
  exportFilename?: string;

  // Callbacks
  /** Enable row click */
  onRowClick?: (row: T) => void;

  // Deprecated (kept for backwards compatibility)
  /** @deprecated Use selectionMode instead */
  selectable?: boolean;
}

/**
 * Header/Navigation component props
 * @see src/components/features/header.tsx
 */
export interface HeaderProps extends BaseComponentProps {
  /** Logo element or URL */
  logo?: ReactNode | string;
  /** Navigation items */
  navigation?: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    active?: boolean;
  }>;
  /** User menu configuration */
  user?: {
    name: string;
    email: string;
    avatar?: string;
    onLogout: () => void;
    menuItems?: Array<{
      label: string;
      href?: string;
      onClick?: () => void;
      icon?: ReactNode;
    }>;
  };
  /** Actions slot (e.g., notifications, settings) */
  actions?: ReactNode;
}

/**
 * Sidebar component props
 * @see src/components/features/sidebar.tsx
 */
export interface SidebarProps extends BaseComponentProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Navigation items */
  items: Array<{
    id: string;
    label: string;
    href?: string;
    icon?: ReactNode;
    badge?: string | number;
    children?: Array<{
      id: string;
      label: string;
      href: string;
    }>;
  }>;
  /** Footer content */
  footer?: ReactNode;
}

// ============================================================================
// 3D Component Types - Three.js/React Three Fiber
// ============================================================================

/**
 * Camera types for 3D scenes
 */
export type CameraType = 'perspective' | 'orthographic';

/**
 * Control types for 3D interaction
 */
export type ControlType = 'orbit' | 'fly' | 'pointer-lock' | 'trackball';

/**
 * Scene component props
 * @see src/components/3d/scene.tsx
 */
export interface SceneProps extends BaseComponentProps {
  /** Camera configuration */
  camera?: {
    type?: CameraType;
    position?: [number, number, number];
    fov?: number;
    near?: number;
    far?: number;
  };
  /** Control type */
  controls?: ControlType;
  /** Whether to show performance stats in dev mode */
  showStats?: boolean;
  /** Background color or environment */
  background?: string | 'environment';
  /** Environment preset */
  environment?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
  /** Enable shadows */
  shadows?: boolean;
  /** Pixel ratio (defaults to device pixel ratio) */
  pixelRatio?: number;
  /** Children (3D objects) */
  children?: ReactNode;
  /** Callback when scene is ready */
  onReady?: () => void;
  /** Fallback for non-WebGL browsers */
  fallback?: ReactNode;
}

/**
 * Model component props for loading 3D models
 * @see src/components/3d/model.tsx
 */
export interface ModelProps extends BaseComponentProps {
  /** Path to the GLTF/GLB model */
  src: string;
  /** Position in 3D space */
  position?: [number, number, number];
  /** Rotation in radians (Euler angles) */
  rotation?: [number, number, number];
  /** Scale (uniform or per-axis) */
  scale?: number | [number, number, number];
  /** Whether the model is interactive (hoverable/clickable) */
  interactive?: boolean;
  /** Callback when model is clicked */
  onClick?: () => void;
  /** Callback when model is hovered */
  onHover?: (hovered: boolean) => void;
  /** Animation to play (by name or index) */
  animation?: string | number;
  /** Whether to loop the animation */
  animationLoop?: boolean;
  /** Animation playback speed */
  animationSpeed?: number;
  /** Loading placeholder */
  placeholder?: ReactNode;
}

/**
 * 3D controls component props
 * @see src/components/3d/controls.tsx
 */
export interface ControlsProps extends BaseComponentProps {
  /** Control type */
  type?: ControlType;
  /** Enable damping (smooth movement) */
  enableDamping?: boolean;
  /** Damping factor */
  dampingFactor?: number;
  /** Enable zoom */
  enableZoom?: boolean;
  /** Enable pan */
  enablePan?: boolean;
  /** Enable rotate */
  enableRotate?: boolean;
  /** Minimum distance (zoom) */
  minDistance?: number;
  /** Maximum distance (zoom) */
  maxDistance?: number;
  /** Minimum polar angle (vertical rotation limit) */
  minPolarAngle?: number;
  /** Maximum polar angle (vertical rotation limit) */
  maxPolarAngle?: number;
  /** Auto rotate */
  autoRotate?: boolean;
  /** Auto rotate speed */
  autoRotateSpeed?: number;
}

/**
 * Post-processing effects configuration
 */
export interface EffectsConfig {
  /** Bloom effect */
  bloom?: {
    intensity?: number;
    luminanceThreshold?: number;
    luminanceSmoothing?: number;
  };
  /** SSAO (ambient occlusion) */
  ssao?: {
    intensity?: number;
    radius?: number;
    samples?: number;
  };
  /** Depth of field */
  dof?: {
    focusDistance?: number;
    focalLength?: number;
    bokehScale?: number;
  };
  /** Vignette */
  vignette?: {
    offset?: number;
    darkness?: number;
  };
}

/**
 * Effects component props
 * @see src/components/3d/effects.tsx
 */
export interface EffectsProps extends BaseComponentProps {
  /** Effects configuration */
  config?: EffectsConfig;
  /** Enable all effects */
  enabled?: boolean;
}

// ============================================================================
// Visualization Component Types - D3.js/Visx
// ============================================================================

/**
 * Common chart props shared across all visualization components
 */
export interface BaseChartProps extends BaseComponentProps, WithLoading {
  /** Chart width (defaults to container width) */
  width?: number;
  /** Chart height */
  height: number;
  /** Chart margins */
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Chart title */
  title?: string;
  /** Chart description for accessibility */
  description?: string;
  /** Color scheme */
  colorScheme?: string[];
  /** Enable animations */
  animated?: boolean;
  /** Enable tooltip */
  showTooltip?: boolean;
  /** Enable legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  /** Enable grid lines */
  showGrid?: boolean;
  /** Callback when data point is clicked */
  onDataPointClick?: (data: unknown, index: number) => void;
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  /** Axis label */
  label?: string;
  /** Tick format function */
  tickFormat?: (value: unknown) => string;
  /** Number of ticks */
  tickCount?: number;
  /** Hide axis line */
  hideAxisLine?: boolean;
  /** Hide tick marks */
  hideTicks?: boolean;
}

/**
 * Line chart data point
 */
export interface LineChartDataPoint {
  x: number | Date;
  y: number;
  label?: string;
}

/**
 * Line chart series
 */
export interface LineChartSeries {
  id: string;
  name: string;
  data: LineChartDataPoint[];
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

/**
 * LineChart component props
 * @see src/components/visualizations/charts/line-chart.tsx
 */
export interface LineChartProps extends BaseChartProps {
  /** Data series to plot */
  series: LineChartSeries[];
  /** X-axis configuration */
  xAxis?: AxisConfig & { type?: 'linear' | 'time' };
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Enable brush selection */
  enableBrush?: boolean;
  /** Callback when brush selection changes */
  onBrushChange?: (domain: [number, number] | null) => void;
  /** Enable zoom */
  enableZoom?: boolean;
  /** Show area fill under lines */
  showArea?: boolean;
  /** Show data points */
  showPoints?: boolean;
  /** Curve type */
  curve?: 'linear' | 'monotone' | 'step' | 'natural';
}

/**
 * Bar chart data point
 */
export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * BarChart component props
 * @see src/components/visualizations/charts/bar-chart.tsx
 */
export interface BarChartProps extends BaseChartProps {
  /** Data to plot */
  data: BarChartDataPoint[];
  /** Bar orientation */
  orientation?: 'vertical' | 'horizontal';
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Enable stacking for grouped data */
  stacked?: boolean;
  /** Bar corner radius */
  borderRadius?: number;
  /** Bar padding (0-1) */
  padding?: number;
}

/**
 * Pie/Donut chart data point
 */
export interface PieChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * PieChart component props
 * @see src/components/visualizations/charts/pie-chart.tsx
 */
export interface PieChartProps extends BaseChartProps {
  /** Data to plot */
  data: PieChartDataPoint[];
  /** Inner radius ratio (0 for pie, >0 for donut) */
  innerRadius?: number;
  /** Padding between slices (radians) */
  padAngle?: number;
  /** Corner radius for slices */
  cornerRadius?: number;
  /** Show value labels */
  showLabels?: boolean;
  /** Label type */
  labelType?: 'value' | 'percent' | 'label';
}

/**
 * Scatter plot data point
 */
export interface ScatterPlotDataPoint {
  x: number;
  y: number;
  size?: number;
  color?: string;
  label?: string;
}

/**
 * ScatterPlot component props
 * @see src/components/visualizations/charts/scatter-plot.tsx
 */
export interface ScatterPlotProps extends BaseChartProps {
  /** Data points to plot */
  data: ScatterPlotDataPoint[];
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Point size (or accessor for variable sizing) */
  pointSize?: number | ((d: ScatterPlotDataPoint) => number);
  /** Enable 2D brush selection */
  enableBrush?: boolean;
  /** Callback when brush selection changes */
  onBrushChange?: (bounds: { x: [number, number]; y: [number, number] } | null) => void;
  /** Show regression line */
  showRegression?: boolean;
}

/**
 * Heatmap data point
 */
export interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
}

/**
 * Heatmap component props
 * @see src/components/visualizations/charts/heatmap.tsx
 */
export interface HeatmapProps extends BaseChartProps {
  /** Data to plot */
  data: HeatmapDataPoint[];
  /** X-axis labels (if categorical) */
  xLabels?: string[];
  /** Y-axis labels (if categorical) */
  yLabels?: string[];
  /** Color scale domain [min, max] */
  colorDomain?: [number, number];
  /** Color scale range */
  colorRange?: [string, string];
  /** Show cell values */
  showValues?: boolean;
  /** Cell padding */
  cellPadding?: number;
}

// ============================================================================
// OpenTLU-Specific Visualization Types
// ============================================================================

/**
 * Uncertainty decomposition chart props
 * @see src/components/visualizations/uncertainty-chart.tsx
 */
export interface UncertaintyChartProps extends BaseChartProps {
  /** Uncertainty data */
  data: UncertaintyEstimate;
  /** Chart type */
  type?: 'bar' | 'gauge' | 'donut';
  /** Show confidence indicator */
  showConfidence?: boolean;
  /** Warning threshold for uncertainty */
  warningThreshold?: number;
  /** Critical threshold for uncertainty */
  criticalThreshold?: number;
}

/**
 * Calibration diagram (reliability diagram) props
 * @see src/components/visualizations/calibration-chart.tsx
 */
export interface CalibrationChartProps extends BaseChartProps {
  /** Bin data for reliability diagram */
  bins: Array<{
    confidence: number;
    accuracy: number;
    count: number;
  }>;
  /** ECE value to display */
  ece?: number;
  /** Show perfect calibration line */
  showPerfectLine?: boolean;
  /** Show histogram of bin counts */
  showHistogram?: boolean;
}

/**
 * Safety margin timeline chart props
 * @see src/components/visualizations/safety-timeline.tsx
 */
export interface SafetyTimelineProps extends BaseChartProps {
  /** Timeline data */
  data: SafetyMarginTimeline[];
  /** Constraints to show */
  constraints?: string[];
  /** Show OOD score */
  showOODScore?: boolean;
  /** Show severity */
  showSeverity?: boolean;
  /** State color mapping */
  stateColors?: Record<MitigationState, string>;
  /** Time range for x-axis */
  timeRange?: [Date, Date];
  /** Enable real-time updates */
  realtime?: boolean;
}

/**
 * OOD score distribution chart props
 * @see src/components/visualizations/ood-distribution.tsx
 */
export interface OODDistributionProps extends BaseChartProps {
  /** In-distribution scores */
  inDistributionScores: number[];
  /** Out-of-distribution scores */
  outDistributionScores?: number[];
  /** Detection threshold */
  threshold: number;
  /** Show threshold line */
  showThreshold?: boolean;
  /** Number of histogram bins */
  bins?: number;
}

/**
 * KPI Card component props
 * @see src/components/visualizations/kpi-card.tsx
 */
export interface KPICardProps extends BaseComponentProps {
  /** KPI title */
  title: string;
  /** Current value */
  value: number | string;
  /** Previous value for comparison */
  previousValue?: number;
  /** Value format (e.g., 'percent', 'number', 'currency') */
  format?: 'percent' | 'number' | 'currency' | 'duration';
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Whether up trend is good */
  trendUpIsGood?: boolean;
  /** Icon to display */
  icon?: ReactNode;
  /** Sparkline data */
  sparkline?: number[];
  /** Description text */
  description?: string;
  /** Click handler */
  onClick?: () => void;
}
