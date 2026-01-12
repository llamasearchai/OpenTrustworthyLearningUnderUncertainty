/**
 * Visualization Core Utilities
 *
 * Core hooks and utilities for D3.js/Visx visualizations.
 * Provides responsive dimensions, scale factories, axis factories,
 * and common utilities for building charts.
 *
 * @module lib/visualizations/core
 */

import { useRef, useState, useLayoutEffect, useCallback, useMemo, useEffect } from 'react';
import * as d3 from 'd3';

// ============================================================================
// Types
// ============================================================================

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Dimensions {
  width: number;
  height: number;
  boundedWidth: number;
  boundedHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export type ScaleType = 'linear' | 'log' | 'time' | 'band' | 'ordinal' | 'point';

export interface TooltipData<T = unknown> {
  x: number;
  y: number;
  data: T;
}

// ============================================================================
// Dimension Hooks
// ============================================================================

const DEFAULT_MARGIN: Margin = {
  top: 40,
  right: 40,
  bottom: 60,
  left: 60,
};

/**
 * Hook for responsive chart dimensions
 *
 * Automatically tracks container size and computes bounded dimensions
 * based on the provided margin configuration.
 *
 * @param containerRef - Reference to the container element
 * @param margin - Optional margin configuration (defaults to 40/40/60/60)
 * @returns Computed dimensions including bounded width/height
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const dimensions = useChartDimensions(containerRef, { top: 20, bottom: 40 });
 * ```
 */
export function useChartDimensions(
  containerRef: React.RefObject<HTMLElement | null>,
  margin: Partial<Margin> = {}
): Dimensions {
  const mergedMargin = useMemo(
    () => ({ ...DEFAULT_MARGIN, ...margin }),
    [margin.top, margin.right, margin.bottom, margin.left]
  );

  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
    boundedWidth: 0,
    boundedHeight: 0,
    marginTop: mergedMargin.top,
    marginRight: mergedMargin.right,
    marginBottom: mergedMargin.bottom,
    marginLeft: mergedMargin.left,
  });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    const updateDimensions = () => {
      const { width, height } = element.getBoundingClientRect();
      setDimensions({
        width,
        height,
        boundedWidth: Math.max(0, width - mergedMargin.left - mergedMargin.right),
        boundedHeight: Math.max(0, height - mergedMargin.top - mergedMargin.bottom),
        marginTop: mergedMargin.top,
        marginRight: mergedMargin.right,
        marginBottom: mergedMargin.bottom,
        marginLeft: mergedMargin.left,
      });
    };

    // Initial measurement
    updateDimensions();

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;

      setDimensions({
        width,
        height,
        boundedWidth: Math.max(0, width - mergedMargin.left - mergedMargin.right),
        boundedHeight: Math.max(0, height - mergedMargin.top - mergedMargin.bottom),
        marginTop: mergedMargin.top,
        marginRight: mergedMargin.right,
        marginBottom: mergedMargin.bottom,
        marginLeft: mergedMargin.left,
      });
    });

    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [
    containerRef,
    mergedMargin.top,
    mergedMargin.right,
    mergedMargin.bottom,
    mergedMargin.left,
  ]);

  return dimensions;
}

/**
 * Hook for resize observer with callback
 *
 * Provides a debounced resize observer that triggers a callback
 * when the observed element changes size.
 *
 * @param ref - Reference to the element to observe
 * @param callback - Function called on resize with (width, height)
 * @param debounceMs - Debounce delay in milliseconds (default: 100)
 *
 * @example
 * ```tsx
 * useResizeObserver(containerRef, (width, height) => {
 *   console.log('Container resized:', width, height);
 * }, 150);
 * ```
 */
export function useResizeObserver(
  ref: React.RefObject<HTMLElement | null>,
  callback: (width: number, height: number) => void,
  debounceMs = 100
) {
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useLayoutEffect(() => {
    if (!ref.current) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const element = ref.current;

    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!entries[0]) return;
        const { width, height } = entries[0].contentRect;
        callbackRef.current(width, height);
      }, debounceMs);
    });

    resizeObserver.observe(element);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [ref, debounceMs]);
}

// ============================================================================
// Scale Factory
// ============================================================================

export interface CreateScaleOptions {
  /** Apply nice rounding to domain (default: true) */
  nice?: boolean;
  /** Clamp values to range (default: false) */
  clamp?: boolean;
  /** Padding for band/point scales (default: 0.1) */
  padding?: number;
  /** Inner padding for band scales */
  paddingInner?: number;
  /** Outer padding for band scales */
  paddingOuter?: number;
  /** Round output values to integers */
  round?: boolean;
  /** Align for point scales (0-1) */
  align?: number;
  /** Custom color range for ordinal scales */
  colorRange?: string[];
  /** Base for log scales (default: 10) */
  base?: number;
}

/**
 * Scale factory types
 */
export type LinearScale = d3.ScaleLinear<number, number>;
export type LogScale = d3.ScaleLogarithmic<number, number>;
export type TimeScale = d3.ScaleTime<number, number>;
export type BandScale = d3.ScaleBand<string>;
export type OrdinalScale = d3.ScaleOrdinal<string, string>;
export type PointScale = d3.ScalePoint<string>;

export type AnyScale = LinearScale | LogScale | TimeScale | BandScale | OrdinalScale | PointScale;

/**
 * Factory function to create D3 scales
 *
 * Creates appropriately configured scales based on type with
 * sensible defaults for each scale type.
 *
 * @param type - Scale type ('linear', 'log', 'time', 'band', 'ordinal', 'point')
 * @param domain - Scale domain (input values)
 * @param range - Scale range (output values)
 * @param options - Additional configuration options
 * @returns Configured D3 scale
 *
 * @example
 * ```tsx
 * // Linear scale for y-axis
 * const yScale = createScale('linear', [0, 100], [height, 0], { nice: true });
 *
 * // Band scale for categorical x-axis
 * const xScale = createScale('band', ['A', 'B', 'C'], [0, width], { padding: 0.2 });
 * ```
 */
export function createScale<T extends ScaleType>(
  type: T,
  domain: unknown[],
  range: [number, number],
  options: CreateScaleOptions = {}
): AnyScale {
  const {
    nice = true,
    clamp = false,
    padding = 0.1,
    paddingInner,
    paddingOuter,
    round = false,
    align = 0.5,
    colorRange,
    base = 10,
  } = options;

  switch (type) {
    case 'linear': {
      const scale = d3.scaleLinear().domain(domain as [number, number]).range(range);
      if (nice) scale.nice();
      if (clamp) scale.clamp(true);
      return scale;
    }
    case 'log': {
      const scale = d3.scaleLog().domain(domain as [number, number]).range(range).base(base);
      if (nice) scale.nice();
      if (clamp) scale.clamp(true);
      return scale;
    }
    case 'time': {
      const scale = d3.scaleTime().domain(domain as [Date, Date]).range(range);
      if (nice) scale.nice();
      if (clamp) scale.clamp(true);
      return scale;
    }
    case 'band': {
      const scale = d3
        .scaleBand()
        .domain(domain as string[])
        .range(range);

      if (paddingInner !== undefined && paddingOuter !== undefined) {
        scale.paddingInner(paddingInner).paddingOuter(paddingOuter);
      } else {
        scale.padding(padding);
      }

      if (round) scale.round(true);
      if (align !== undefined) scale.align(align);

      return scale;
    }
    case 'ordinal': {
      const scale = d3
        .scaleOrdinal<string>()
        .domain(domain as string[])
        .range(colorRange ?? d3.schemeCategory10);
      return scale as unknown as OrdinalScale;
    }
    case 'point': {
      const scale = d3
        .scalePoint()
        .domain(domain as string[])
        .range(range)
        .padding(padding);

      if (round) scale.round(true);
      if (align !== undefined) scale.align(align);

      return scale;
    }
    default:
      throw new Error(`Unknown scale type: ${type}`);
  }
}

// ============================================================================
// Axis Factory
// ============================================================================

export interface CreateAxisOptions {
  /** Number of ticks to display */
  tickCount?: number;
  /** Custom tick format function */
  tickFormat?: (value: unknown) => string;
  /** Size of tick marks */
  tickSize?: number;
  /** Size of inner tick marks */
  tickSizeInner?: number;
  /** Size of outer tick marks */
  tickSizeOuter?: number;
  /** Padding between tick marks and labels */
  tickPadding?: number;
  /** Hide the axis line */
  hideAxisLine?: boolean;
  /** Hide tick marks */
  hideTicks?: boolean;
  /** Specific tick values to display */
  tickValues?: unknown[];
}

export type AxisOrientation = 'top' | 'right' | 'bottom' | 'left';

/**
 * Factory function to create D3 axes
 *
 * Creates properly configured D3 axes with sensible defaults.
 *
 * @param scale - The D3 scale to use for the axis
 * @param orientation - Axis orientation ('top', 'right', 'bottom', 'left')
 * @param options - Additional configuration options
 * @returns Configured D3 axis
 *
 * @example
 * ```tsx
 * const xAxis = createAxis(xScale, 'bottom', {
 *   tickCount: 5,
 *   tickFormat: d => `${d}%`
 * });
 * ```
 */
export function createAxis(
  scale: d3.AxisScale<d3.AxisDomain>,
  orientation: AxisOrientation,
  options: CreateAxisOptions = {}
): d3.Axis<d3.AxisDomain> {
  const {
    tickCount,
    tickFormat,
    tickSize,
    tickSizeInner,
    tickSizeOuter,
    tickPadding = 3,
    hideAxisLine = false,
    hideTicks = false,
    tickValues,
  } = options;

  let axis: d3.Axis<d3.AxisDomain>;

  switch (orientation) {
    case 'top':
      axis = d3.axisTop(scale);
      break;
    case 'right':
      axis = d3.axisRight(scale);
      break;
    case 'bottom':
      axis = d3.axisBottom(scale);
      break;
    case 'left':
      axis = d3.axisLeft(scale);
      break;
  }

  if (tickCount !== undefined) axis.ticks(tickCount);
  if (tickFormat) axis.tickFormat(tickFormat as (d: d3.AxisDomain) => string);
  if (tickValues) axis.tickValues(tickValues as d3.AxisDomain[]);

  if (tickSize !== undefined) {
    axis.tickSize(tickSize);
  } else {
    if (tickSizeInner !== undefined) axis.tickSizeInner(tickSizeInner);
    if (tickSizeOuter !== undefined) axis.tickSizeOuter(tickSizeOuter);
  }

  axis.tickPadding(tickPadding);

  // Handle hidden axis line and ticks
  if (hideAxisLine || hideTicks) {
    // These are typically applied after rendering via selection
  }

  return axis;
}

// ============================================================================
// Tooltip Hook
// ============================================================================

export interface UseTooltipReturn<T = unknown> {
  tooltipData: TooltipData<T> | null;
  showTooltip: (x: number, y: number, data: T) => void;
  hideTooltip: () => void;
  tooltipLeft: number;
  tooltipTop: number;
  isTooltipVisible: boolean;
  updateTooltipPosition: (x: number, y: number) => void;
}

/**
 * Hook for managing tooltip state
 *
 * Provides state and callbacks for showing/hiding tooltips
 * with position and data management.
 *
 * @returns Tooltip state and control functions
 *
 * @example
 * ```tsx
 * const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = useTooltip();
 *
 * <circle
 *   onMouseEnter={(e) => showTooltip(e.clientX, e.clientY, dataPoint)}
 *   onMouseLeave={hideTooltip}
 * />
 * ```
 */
export function useTooltip<T = unknown>(): UseTooltipReturn<T> {
  const [tooltipData, setTooltipData] = useState<TooltipData<T> | null>(null);

  const showTooltip = useCallback((x: number, y: number, data: T) => {
    setTooltipData({ x, y, data });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipData(null);
  }, []);

  const updateTooltipPosition = useCallback((x: number, y: number) => {
    setTooltipData((prev) => prev ? { ...prev, x, y } : null);
  }, []);

  return {
    tooltipData,
    showTooltip,
    hideTooltip,
    tooltipLeft: tooltipData?.x ?? 0,
    tooltipTop: tooltipData?.y ?? 0,
    isTooltipVisible: tooltipData !== null,
    updateTooltipPosition,
  };
}

// ============================================================================
// Formatters
// ============================================================================

/**
 * Collection of value formatters for chart labels and tooltips
 */
export const formatters = {
  /**
   * Format a number with optional decimals and thousand separators
   */
  number: (value: number, decimals = 2, separator = true): string => {
    if (!isFinite(value)) return String(value);
    if (separator) {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return value.toFixed(decimals);
  },

  /**
   * Format a number as a percentage
   */
  percent: (value: number, decimals = 1): string => {
    if (!isFinite(value)) return String(value);
    return `${(value * 100).toFixed(decimals)}%`;
  },

  /**
   * Format a number as currency
   */
  currency: (value: number, currency = 'USD', locale?: string): string => {
    if (!isFinite(value)) return String(value);
    return value.toLocaleString(locale, {
      style: 'currency',
      currency,
    });
  },

  /**
   * Format a date with various patterns
   */
  date: (value: Date | number, pattern: 'short' | 'long' | 'time' | 'datetime' | 'iso' = 'short'): string => {
    const date = typeof value === 'number' ? new Date(value) : value;
    if (isNaN(date.getTime())) return String(value);

    switch (pattern) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'time':
        return date.toLocaleTimeString();
      case 'datetime':
        return date.toLocaleString();
      case 'iso':
        return date.toISOString();
      default:
        return date.toLocaleDateString();
    }
  },

  /**
   * Format a duration in milliseconds to human-readable string
   */
  duration: (ms: number): string => {
    if (!isFinite(ms) || ms < 0) return String(ms);

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    if (seconds > 0) return `${seconds}s`;
    return `${ms}ms`;
  },

  /**
   * Format a number in compact notation (e.g., 1.2K, 3.4M)
   */
  compact: (value: number, decimals = 1): string => {
    if (!isFinite(value)) return String(value);

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e9) {
      return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
    }
    if (absValue >= 1e6) {
      return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
    }
    if (absValue >= 1e3) {
      return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
    }
    return value.toFixed(decimals);
  },

  /**
   * Format bytes to human-readable size
   */
  bytes: (bytes: number, decimals = 2): string => {
    if (!isFinite(bytes) || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
  },
};

// ============================================================================
// Color Schemes
// ============================================================================

/**
 * Color scheme collections for visualizations
 */
export const colorSchemes = {
  /** 10-color categorical palette */
  categorical: [
    '#4299e1', // blue
    '#48bb78', // green
    '#ed8936', // orange
    '#9f7aea', // purple
    '#f56565', // red
    '#38b2ac', // teal
    '#ed64a6', // pink
    '#ecc94b', // yellow
    '#667eea', // indigo
    '#718096', // gray
  ],

  /** Sequential color palette (light to dark) */
  sequential: [
    '#f7fafc',
    '#edf2f7',
    '#e2e8f0',
    '#cbd5e0',
    '#a0aec0',
    '#718096',
    '#4a5568',
    '#2d3748',
    '#1a202c',
  ],

  /** Diverging color palette (red to green via white) */
  diverging: [
    '#e53e3e', // red
    '#ed8936', // orange
    '#ecc94b', // yellow
    '#f7fafc', // white
    '#48bb78', // light green
    '#38a169', // green
    '#276749', // dark green
  ],

  /** Uncertainty level colors */
  uncertainty: {
    low: '#48bb78', // green
    medium: '#ecc94b', // yellow
    high: '#ed8936', // orange
    critical: '#e53e3e', // red
  },

  /** Mitigation state colors */
  mitigation: {
    nominal: '#48bb78', // green
    cautious: '#ecc94b', // yellow
    fallback: '#ed8936', // orange
    safe_stop: '#e53e3e', // red
    human_escalation: '#9f7aea', // purple
  },

  /** Blue sequential palette */
  blues: [
    '#eff6ff',
    '#dbeafe',
    '#bfdbfe',
    '#93c5fd',
    '#60a5fa',
    '#3b82f6',
    '#2563eb',
    '#1d4ed8',
    '#1e40af',
  ],

  /** Green sequential palette */
  greens: [
    '#f0fdf4',
    '#dcfce7',
    '#bbf7d0',
    '#86efac',
    '#4ade80',
    '#22c55e',
    '#16a34a',
    '#15803d',
    '#166534',
  ],

  /** Red sequential palette */
  reds: [
    '#fef2f2',
    '#fee2e2',
    '#fecaca',
    '#fca5a5',
    '#f87171',
    '#ef4444',
    '#dc2626',
    '#b91c1c',
    '#991b1b',
  ],
};

// ============================================================================
// Accessibility Hook
// ============================================================================

export interface ChartA11yProps {
  role: 'img';
  'aria-label': string;
  'aria-describedby'?: string;
  tabIndex: number;
}

/**
 * Hook for generating accessible chart attributes
 *
 * Generates ARIA attributes and other accessibility properties
 * for SVG chart elements.
 *
 * @param chartId - Unique identifier for the chart
 * @param title - Chart title for screen readers
 * @param description - Optional detailed description
 * @returns Object with accessibility attributes
 *
 * @example
 * ```tsx
 * const a11yProps = useChartA11y('my-chart', 'Sales Over Time', 'Monthly sales from 2020 to 2024');
 * return <svg {...a11yProps}>...</svg>;
 * ```
 */
export function useChartA11y(
  chartId: string,
  title: string,
  description?: string
): ChartA11yProps {
  const ariaLabel = description ? `${title}. ${description}` : title;

  return {
    role: 'img' as const,
    'aria-label': ariaLabel,
    'aria-describedby': description ? `${chartId}-desc` : undefined,
    tabIndex: 0,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the extent (min/max) of a numeric array
 */
export function getExtent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Add padding to a domain extent
 */
export function padExtent(
  extent: [number, number],
  paddingPercent = 0.1
): [number, number] {
  const [min, max] = extent;
  const range = max - min;
  const padding = range * paddingPercent;
  return [min - padding, max + padding];
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Generate evenly spaced tick values
 */
export function generateTicks(
  domain: [number, number],
  count: number
): number[] {
  const [min, max] = domain;
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

/**
 * Calculate the ideal number of bins for a histogram
 * using Sturges' formula
 */
export function calculateBinCount(dataLength: number): number {
  return Math.ceil(Math.log2(dataLength) + 1);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
