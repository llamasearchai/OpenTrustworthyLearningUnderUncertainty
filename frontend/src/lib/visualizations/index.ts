/**
 * Visualization Library Index
 *
 * Central export point for all visualization utilities, hooks,
 * themes, and helpers for D3.js/Visx chart implementations.
 *
 * @module lib/visualizations
 */

// Core utilities and hooks
export {
  // Hooks
  useChartDimensions,
  useResizeObserver,
  useTooltip,
  useChartA11y,
  // Factories
  createScale,
  createAxis,
  // Types
  type Margin,
  type Dimensions,
  type ScaleType,
  type TooltipData,
  type CreateScaleOptions,
  type CreateAxisOptions,
  type AxisOrientation,
  type LinearScale,
  type LogScale,
  type TimeScale,
  type BandScale,
  type OrdinalScale,
  type PointScale,
  type AnyScale,
  type UseTooltipReturn,
  type ChartA11yProps,
  // Formatters
  formatters,
  // Color schemes
  colorSchemes,
  // Utilities
  getExtent,
  padExtent,
  clamp,
  lerp,
  generateTicks,
  calculateBinCount,
  debounce,
} from './core';

// Theme system
export {
  // Themes
  lightTheme,
  darkTheme,
  // Color palettes
  categoricalColors,
  extendedCategoricalColors,
  sequentialColors,
  divergingColors,
  semanticColors,
  // Hooks
  useChartTheme,
  // Utilities
  getSequentialColor,
  getDivergingColor,
  getCategoryColors,
  createGradientId,
  createPatternId,
  // Types
  type ColorSchemes,
  type ChartTypography,
  type ChartSpacing,
  type ChartAnimation,
  type ChartGrid,
  type ChartAxisStyle,
  type ChartTooltipStyle,
  type ChartTheme,
  type UseChartThemeOptions,
} from './theme';

// Tooltip system
export {
  // Hooks
  useTooltip as useVisxTooltip,
  useCrosshair,
  // Components
  TooltipPortal,
  TooltipContainer,
  TooltipRow,
  // Formatters
  formatNumber,
  formatPercent,
  formatCurrency,
  formatDate,
  formatDuration,
  formatCompact,
  formatTooltipValue,
  // Utilities
  calculateSmartPosition,
  // Types
  type TooltipPosition,
  type UseTooltipOptions,
  type UseTooltipReturn as UseVisxTooltipReturn,
  type TooltipContainerProps,
  type TooltipRowProps,
  type TooltipValueConfig,
  type SmartPositionOptions,
  type UseCrosshairOptions,
  type UseCrosshairReturn,
} from './tooltip';

// Accessibility system
export {
  // Hooks
  useChartA11y as useChartAccessibility,
  useChartKeyboardNav,
  usePatternFills,
  // Functions
  generateDataTable,
  generatePatternDef,
  announceChartUpdate,
  generatePointAnnouncement,
  // Styles
  srOnlyStyles,
  srOnlyClassName,
  // Types
  type ChartDataPoint,
  type ChartSeries,
  type DataTableColumn,
  type PatternFill,
  type KeyboardNavState,
  type UseChartA11yOptions,
  type UseChartA11yReturn,
  type GenerateDataTableOptions,
  type DataTableResult,
  type UseChartKeyboardNavOptions,
  type UseChartKeyboardNavReturn,
  type UsePatternFillsOptions,
  type UsePatternFillsReturn,
} from './a11y';
