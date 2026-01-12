/**
 * Visualization Theme System
 *
 * Provides comprehensive theming for D3.js/Visx visualizations including
 * color schemes, typography, spacing, and dark mode support.
 *
 * @module lib/visualizations/theme
 */

import { useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Color scheme collection interface
 */
export interface ColorSchemes {
  /** 10-color categorical palette for distinct categories */
  categorical: readonly string[];
  /** Sequential palette from light to dark */
  sequential: readonly string[];
  /** Diverging palette centered on neutral */
  diverging: readonly string[];
  /** Blue sequential gradient */
  blues: readonly string[];
  /** Green sequential gradient */
  greens: readonly string[];
  /** Red sequential gradient */
  reds: readonly string[];
  /** Orange sequential gradient */
  oranges: readonly string[];
  /** Purple sequential gradient */
  purples: readonly string[];
}

/**
 * Typography configuration for charts
 */
export interface ChartTypography {
  /** Font family for all text */
  fontFamily: string;
  /** Title font size */
  titleSize: number;
  /** Title font weight */
  titleWeight: number;
  /** Subtitle font size */
  subtitleSize: number;
  /** Axis label font size */
  axisLabelSize: number;
  /** Tick label font size */
  tickLabelSize: number;
  /** Legend font size */
  legendSize: number;
  /** Tooltip title font size */
  tooltipTitleSize: number;
  /** Tooltip body font size */
  tooltipBodySize: number;
  /** Annotation font size */
  annotationSize: number;
}

/**
 * Spacing configuration for charts
 */
export interface ChartSpacing {
  /** Extra small spacing (4px) */
  xs: number;
  /** Small spacing (8px) */
  sm: number;
  /** Medium spacing (16px) */
  md: number;
  /** Large spacing (24px) */
  lg: number;
  /** Extra large spacing (32px) */
  xl: number;
  /** Padding inside chart bounds */
  chartPadding: number;
  /** Gap between legend items */
  legendGap: number;
  /** Padding around tooltip content */
  tooltipPadding: number;
}

/**
 * Animation configuration for charts
 */
export interface ChartAnimation {
  /** Whether animations are enabled */
  enabled: boolean;
  /** Default animation duration in ms */
  duration: number;
  /** Default easing function */
  easing: string;
  /** Stagger delay for sequential animations */
  stagger: number;
  /** Enter animation duration */
  enterDuration: number;
  /** Update animation duration */
  updateDuration: number;
  /** Exit animation duration */
  exitDuration: number;
}

/**
 * Grid configuration for charts
 */
export interface ChartGrid {
  /** Grid line color */
  color: string;
  /** Grid line opacity */
  opacity: number;
  /** Grid line width */
  strokeWidth: number;
  /** Grid line dash array */
  strokeDasharray?: string;
}

/**
 * Axis configuration for charts
 */
export interface ChartAxisStyle {
  /** Axis line color */
  lineColor: string;
  /** Axis line width */
  lineWidth: number;
  /** Tick color */
  tickColor: string;
  /** Tick length */
  tickLength: number;
  /** Tick label color */
  labelColor: string;
  /** Axis title color */
  titleColor: string;
}

/**
 * Tooltip configuration for charts
 */
export interface ChartTooltipStyle {
  /** Background color */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
  /** Border width */
  borderWidth: number;
  /** Border radius */
  borderRadius: number;
  /** Box shadow */
  boxShadow: string;
  /** Text color */
  textColor: string;
  /** Secondary text color */
  secondaryTextColor: string;
}

/**
 * Complete chart theme interface
 */
export interface ChartTheme {
  /** Theme name/identifier */
  name: 'light' | 'dark';
  /** Color schemes */
  colors: ColorSchemes & {
    /** Primary brand color */
    primary: string;
    /** Secondary brand color */
    secondary: string;
    /** Success color */
    success: string;
    /** Warning color */
    warning: string;
    /** Error/danger color */
    error: string;
    /** Info color */
    info: string;
    /** Chart background color */
    background: string;
    /** Chart surface color (for cards, etc.) */
    surface: string;
    /** Primary text color */
    text: string;
    /** Muted text color */
    textMuted: string;
    /** Border color */
    border: string;
  };
  /** Typography settings */
  typography: ChartTypography;
  /** Spacing values */
  spacing: ChartSpacing;
  /** Animation settings */
  animation: ChartAnimation;
  /** Grid styling */
  grid: ChartGrid;
  /** Axis styling */
  axis: ChartAxisStyle;
  /** Tooltip styling */
  tooltip: ChartTooltipStyle;
}

// ============================================================================
// Color Schemes
// ============================================================================

/**
 * 10-color categorical palette optimized for accessibility
 */
export const categoricalColors: readonly string[] = [
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
] as const;

/**
 * Extended categorical palette with 20 colors
 */
export const extendedCategoricalColors: readonly string[] = [
  ...categoricalColors,
  '#3182ce', // darker blue
  '#38a169', // darker green
  '#dd6b20', // darker orange
  '#805ad5', // darker purple
  '#e53e3e', // darker red
  '#319795', // darker teal
  '#d53f8c', // darker pink
  '#d69e2e', // darker yellow
  '#5a67d8', // darker indigo
  '#4a5568', // darker gray
] as const;

/**
 * Sequential color palettes
 */
export const sequentialColors = {
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
  ] as const,
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
  ] as const,
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
  ] as const,
  oranges: [
    '#fff7ed',
    '#ffedd5',
    '#fed7aa',
    '#fdba74',
    '#fb923c',
    '#f97316',
    '#ea580c',
    '#c2410c',
    '#9a3412',
  ] as const,
  purples: [
    '#faf5ff',
    '#f3e8ff',
    '#e9d5ff',
    '#d8b4fe',
    '#c084fc',
    '#a855f7',
    '#9333ea',
    '#7e22ce',
    '#6b21a8',
  ] as const,
  grays: [
    '#f9fafb',
    '#f3f4f6',
    '#e5e7eb',
    '#d1d5db',
    '#9ca3af',
    '#6b7280',
    '#4b5563',
    '#374151',
    '#1f2937',
  ] as const,
};

/**
 * Diverging color palettes (centered on neutral)
 */
export const divergingColors = {
  redBlue: [
    '#b91c1c',
    '#dc2626',
    '#ef4444',
    '#fca5a5',
    '#f5f5f5',
    '#93c5fd',
    '#3b82f6',
    '#2563eb',
    '#1d4ed8',
  ] as const,
  redGreen: [
    '#b91c1c',
    '#dc2626',
    '#ef4444',
    '#fca5a5',
    '#f5f5f5',
    '#86efac',
    '#22c55e',
    '#16a34a',
    '#166534',
  ] as const,
  purpleGreen: [
    '#6b21a8',
    '#9333ea',
    '#a855f7',
    '#d8b4fe',
    '#f5f5f5',
    '#86efac',
    '#22c55e',
    '#16a34a',
    '#166534',
  ] as const,
};

/**
 * Semantic colors for specific data meanings
 */
export const semanticColors = {
  uncertainty: {
    low: '#22c55e', // green
    medium: '#eab308', // yellow
    high: '#f97316', // orange
    critical: '#ef4444', // red
  },
  mitigation: {
    nominal: '#22c55e', // green
    cautious: '#eab308', // yellow
    fallback: '#f97316', // orange
    safe_stop: '#ef4444', // red
    human_escalation: '#a855f7', // purple
  },
  calibration: {
    underconfident: '#3b82f6', // blue
    wellCalibrated: '#22c55e', // green
    overconfident: '#ef4444', // red
  },
  ood: {
    inDistribution: '#22c55e', // green
    nearOOD: '#eab308', // yellow
    outOfDistribution: '#ef4444', // red
  },
};

// ============================================================================
// Theme Definitions
// ============================================================================

/**
 * Light theme configuration
 */
export const lightTheme: ChartTheme = {
  name: 'light',
  colors: {
    categorical: categoricalColors,
    sequential: sequentialColors.grays,
    diverging: divergingColors.redBlue,
    blues: sequentialColors.blues,
    greens: sequentialColors.greens,
    reds: sequentialColors.reds,
    oranges: sequentialColors.oranges,
    purples: sequentialColors.purples,
    primary: '#3b82f6',
    secondary: '#6366f1',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#0ea5e9',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    titleSize: 18,
    titleWeight: 600,
    subtitleSize: 14,
    axisLabelSize: 12,
    tickLabelSize: 11,
    legendSize: 12,
    tooltipTitleSize: 13,
    tooltipBodySize: 12,
    annotationSize: 11,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    chartPadding: 16,
    legendGap: 16,
    tooltipPadding: 12,
  },
  animation: {
    enabled: true,
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    stagger: 50,
    enterDuration: 400,
    updateDuration: 300,
    exitDuration: 200,
  },
  grid: {
    color: '#e5e7eb',
    opacity: 0.5,
    strokeWidth: 1,
    strokeDasharray: undefined,
  },
  axis: {
    lineColor: '#9ca3af',
    lineWidth: 1,
    tickColor: '#9ca3af',
    tickLength: 5,
    labelColor: '#6b7280',
    titleColor: '#374151',
  },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    textColor: '#111827',
    secondaryTextColor: '#6b7280',
  },
};

/**
 * Dark theme configuration
 */
export const darkTheme: ChartTheme = {
  name: 'dark',
  colors: {
    categorical: categoricalColors,
    sequential: [...sequentialColors.grays].reverse() as unknown as readonly string[],
    diverging: divergingColors.redBlue,
    blues: sequentialColors.blues,
    greens: sequentialColors.greens,
    reds: sequentialColors.reds,
    oranges: sequentialColors.oranges,
    purples: sequentialColors.purples,
    primary: '#60a5fa',
    secondary: '#818cf8',
    success: '#4ade80',
    warning: '#facc15',
    error: '#f87171',
    info: '#38bdf8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    titleSize: 18,
    titleWeight: 600,
    subtitleSize: 14,
    axisLabelSize: 12,
    tickLabelSize: 11,
    legendSize: 12,
    tooltipTitleSize: 13,
    tooltipBodySize: 12,
    annotationSize: 11,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    chartPadding: 16,
    legendGap: 16,
    tooltipPadding: 12,
  },
  animation: {
    enabled: true,
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    stagger: 50,
    enterDuration: 400,
    updateDuration: 300,
    exitDuration: 200,
  },
  grid: {
    color: '#334155',
    opacity: 0.5,
    strokeWidth: 1,
    strokeDasharray: undefined,
  },
  axis: {
    lineColor: '#475569',
    lineWidth: 1,
    tickColor: '#475569',
    tickLength: 5,
    labelColor: '#94a3b8',
    titleColor: '#cbd5e1',
  },
  tooltip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)',
    textColor: '#f8fafc',
    secondaryTextColor: '#94a3b8',
  },
};

// ============================================================================
// Theme Hook
// ============================================================================

/**
 * Detect if dark mode is preferred
 */
function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/**
 * Get theme from document root class
 */
function getDocumentTheme(): 'light' | 'dark' | null {
  if (typeof document === 'undefined') return null;
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  return null;
}

export interface UseChartThemeOptions {
  /** Force a specific theme */
  theme?: 'light' | 'dark';
  /** Custom theme overrides */
  overrides?: Partial<ChartTheme>;
}

/**
 * Hook for accessing chart theme with app theme integration
 *
 * Automatically detects light/dark mode from the app's theme context
 * and provides the appropriate chart theme configuration.
 *
 * @param options - Theme options including forced theme and overrides
 * @returns Complete chart theme object
 *
 * @example
 * ```tsx
 * const theme = useChartTheme();
 * // Use theme.colors.categorical for color scales
 * // Use theme.axis for axis styling
 * ```
 */
export function useChartTheme(options: UseChartThemeOptions = {}): ChartTheme {
  const { theme: forcedTheme, overrides } = options;

  return useMemo(() => {
    // Determine which theme to use
    let themeName: 'light' | 'dark' = 'light';

    if (forcedTheme) {
      themeName = forcedTheme;
    } else {
      const docTheme = getDocumentTheme();
      if (docTheme) {
        themeName = docTheme;
      } else if (prefersDarkMode()) {
        themeName = 'dark';
      }
    }

    // Get base theme
    const baseTheme = themeName === 'dark' ? darkTheme : lightTheme;

    // Apply overrides if provided
    if (overrides) {
      return {
        ...baseTheme,
        ...overrides,
        colors: {
          ...baseTheme.colors,
          ...(overrides.colors || {}),
        },
        typography: {
          ...baseTheme.typography,
          ...(overrides.typography || {}),
        },
        spacing: {
          ...baseTheme.spacing,
          ...(overrides.spacing || {}),
        },
        animation: {
          ...baseTheme.animation,
          ...(overrides.animation || {}),
        },
        grid: {
          ...baseTheme.grid,
          ...(overrides.grid || {}),
        },
        axis: {
          ...baseTheme.axis,
          ...(overrides.axis || {}),
        },
        tooltip: {
          ...baseTheme.tooltip,
          ...(overrides.tooltip || {}),
        },
      };
    }

    return baseTheme;
  }, [forcedTheme, overrides]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a color from a sequential palette by position
 *
 * @param palette - Sequential color palette
 * @param position - Position in range [0, 1]
 * @returns Color from palette
 */
export function getSequentialColor(
  palette: readonly string[],
  position: number
): string {
  const clampedPosition = Math.max(0, Math.min(1, position));
  const index = Math.floor(clampedPosition * (palette.length - 1));
  return palette[index];
}

/**
 * Get a color from a diverging palette by position
 *
 * @param palette - Diverging color palette (centered)
 * @param position - Position in range [-1, 1] where 0 is center
 * @returns Color from palette
 */
export function getDivergingColor(
  palette: readonly string[],
  position: number
): string {
  const clampedPosition = Math.max(-1, Math.min(1, position));
  const normalizedPosition = (clampedPosition + 1) / 2; // Convert to [0, 1]
  const index = Math.floor(normalizedPosition * (palette.length - 1));
  return palette[index];
}

/**
 * Get colors for a specific number of categories
 *
 * @param count - Number of categories needed
 * @param palette - Optional custom palette (defaults to categorical)
 * @returns Array of colors
 */
export function getCategoryColors(
  count: number,
  palette: readonly string[] = categoricalColors
): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}

/**
 * Create a gradient ID for SVG definitions
 *
 * @param baseId - Base identifier
 * @param index - Optional index for uniqueness
 * @returns Unique gradient ID
 */
export function createGradientId(baseId: string, index?: number): string {
  return index !== undefined ? `${baseId}-gradient-${index}` : `${baseId}-gradient`;
}

/**
 * Create a pattern ID for SVG definitions
 *
 * @param baseId - Base identifier
 * @param type - Pattern type
 * @returns Unique pattern ID
 */
export function createPatternId(baseId: string, type: string): string {
  return `${baseId}-pattern-${type}`;
}
