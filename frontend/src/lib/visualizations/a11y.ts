/**
 * Visualization Accessibility System
 *
 * Provides accessibility hooks, ARIA generators, keyboard navigation,
 * pattern fills for colorblind accessibility, and data table alternatives.
 *
 * @module lib/visualizations/a11y
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  [key: string]: unknown;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: ChartDataPoint[];
}

export interface DataTableColumn {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

export interface PatternFill {
  id: string;
  type: 'lines' | 'dots' | 'crosshatch' | 'diagonal' | 'horizontal' | 'vertical' | 'circles';
  color: string;
  backgroundColor?: string;
}

export interface KeyboardNavState {
  focusedIndex: number;
  focusedSeries?: string;
  isFocused: boolean;
}

// ============================================================================
// useChartA11y Hook
// ============================================================================

export interface UseChartA11yOptions {
  /** Unique chart identifier */
  chartId: string;
  /** Chart title */
  title: string;
  /** Chart description */
  description?: string;
  /** Chart type for context */
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'other';
  /** Data series for summary generation */
  series?: ChartSeries[];
  /** Generate detailed data summary */
  includeDataSummary?: boolean;
}

export interface UseChartA11yReturn {
  /** ARIA props for the chart SVG */
  chartProps: {
    role: 'img';
    'aria-label': string;
    'aria-describedby': string;
    tabIndex: number;
  };
  /** ID for the description element */
  descriptionId: string;
  /** ID for the title element */
  titleId: string;
  /** Generated description text */
  descriptionText: string;
  /** Generated summary for screen readers */
  summary: string;
}

/**
 * Hook for generating comprehensive ARIA labels for charts
 *
 * Generates accessible labels, descriptions, and summaries for
 * chart visualizations based on chart type and data.
 *
 * @param options - Chart accessibility options
 * @returns Accessibility props and generated text
 *
 * @example
 * ```tsx
 * const { chartProps, descriptionId, descriptionText } = useChartA11y({
 *   chartId: 'sales-chart',
 *   title: 'Monthly Sales',
 *   description: 'Sales data from January to December 2024',
 *   chartType: 'line',
 *   series: salesData,
 * });
 *
 * return (
 *   <>
 *     <svg {...chartProps}>...</svg>
 *     <div id={descriptionId} className="sr-only">{descriptionText}</div>
 *   </>
 * );
 * ```
 */
export function useChartA11y(options: UseChartA11yOptions): UseChartA11yReturn {
  const {
    chartId,
    title,
    description,
    chartType = 'other',
    series = [],
    includeDataSummary = true,
  } = options;

  const descriptionId = `${chartId}-desc`;
  const titleId = `${chartId}-title`;

  const summary = useMemo(() => {
    const parts: string[] = [];

    // Add chart type context
    const chartTypeLabel = getChartTypeLabel(chartType);
    parts.push(`${chartTypeLabel} showing ${title}.`);

    // Add description if provided
    if (description) {
      parts.push(description);
    }

    // Add data summary if enabled
    if (includeDataSummary && series.length > 0) {
      const dataSummary = generateDataSummary(series, chartType);
      parts.push(dataSummary);
    }

    return parts.join(' ');
  }, [title, description, chartType, series, includeDataSummary]);

  const descriptionText = useMemo(() => {
    if (!includeDataSummary || series.length === 0) {
      return description || '';
    }

    const details: string[] = [];

    series.forEach((s) => {
      if (s.data.length === 0) return;

      const values = s.data.map((d) => d.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      details.push(
        `${s.name}: ${s.data.length} data points, ` +
          `ranging from ${min.toFixed(2)} to ${max.toFixed(2)}, ` +
          `average ${avg.toFixed(2)}.`
      );
    });

    return details.join(' ');
  }, [series, includeDataSummary, description]);

  const chartProps = useMemo(
    () => ({
      role: 'img' as const,
      'aria-label': summary,
      'aria-describedby': descriptionId,
      tabIndex: 0,
    }),
    [summary, descriptionId]
  );

  return {
    chartProps,
    descriptionId,
    titleId,
    descriptionText,
    summary,
  };
}

function getChartTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    line: 'Line chart',
    bar: 'Bar chart',
    pie: 'Pie chart',
    scatter: 'Scatter plot',
    area: 'Area chart',
    other: 'Chart',
  };
  return labels[type] || 'Chart';
}

function generateDataSummary(series: ChartSeries[], chartType: string): string {
  if (series.length === 0) return '';

  const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);

  if (series.length === 1) {
    return `Contains ${totalPoints} data points.`;
  }

  return `Contains ${series.length} data series with a total of ${totalPoints} data points.`;
}

// ============================================================================
// generateDataTable Function
// ============================================================================

export interface GenerateDataTableOptions {
  /** Data series to convert */
  series: ChartSeries[];
  /** Column definitions */
  columns?: DataTableColumn[];
  /** Include series name column */
  includeSeriesColumn?: boolean;
  /** Table caption */
  caption?: string;
  /** Table summary for screen readers */
  summary?: string;
}

export interface DataTableResult {
  /** HTML table element string */
  html: string;
  /** Table data as 2D array */
  rows: Array<Array<string | number>>;
  /** Column headers */
  headers: string[];
}

/**
 * Generate an accessible data table alternative to a chart
 *
 * Creates an HTML table representation of chart data that can be
 * used as a screen reader alternative or data export.
 *
 * @param options - Table generation options
 * @returns Table HTML, data rows, and headers
 *
 * @example
 * ```tsx
 * const { html, rows, headers } = generateDataTable({
 *   series: chartData,
 *   caption: 'Monthly Sales Data',
 *   includeSeriesColumn: true,
 * });
 *
 * // Render as accessible alternative
 * <div className="sr-only" dangerouslySetInnerHTML={{ __html: html }} />
 * ```
 */
export function generateDataTable(options: GenerateDataTableOptions): DataTableResult {
  const {
    series,
    columns,
    includeSeriesColumn = series.length > 1,
    caption,
    summary,
  } = options;

  const headers: string[] = [];
  const rows: Array<Array<string | number>> = [];

  // Build headers
  if (includeSeriesColumn) {
    headers.push('Series');
  }
  headers.push('X', 'Y');

  if (columns) {
    columns.forEach((col) => {
      if (col.key !== 'x' && col.key !== 'y') {
        headers.push(col.header);
      }
    });
  }

  // Build rows
  series.forEach((s) => {
    s.data.forEach((point) => {
      const row: Array<string | number> = [];

      if (includeSeriesColumn) {
        row.push(s.name);
      }

      // Format X value
      if (point.x instanceof Date) {
        row.push(point.x.toLocaleDateString());
      } else {
        row.push(point.x);
      }

      // Format Y value
      row.push(typeof point.y === 'number' ? point.y.toFixed(2) : point.y);

      // Add additional columns
      if (columns) {
        columns.forEach((col) => {
          if (col.key !== 'x' && col.key !== 'y' && point[col.key] !== undefined) {
            const value = point[col.key];
            row.push(col.format ? col.format(value) : String(value));
          }
        });
      }

      rows.push(row);
    });
  });

  // Generate HTML
  const html = generateTableHtml(headers, rows, caption, summary);

  return { html, rows, headers };
}

function generateTableHtml(
  headers: string[],
  rows: Array<Array<string | number>>,
  caption?: string,
  summary?: string
): string {
  const captionHtml = caption ? `<caption>${escapeHtml(caption)}</caption>` : '';
  const summaryAttr = summary ? ` summary="${escapeHtml(summary)}"` : '';

  const theadHtml = `
    <thead>
      <tr>
        ${headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
  `;

  const tbodyHtml = `
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr>
          ${row.map((cell, i) => (i === 0 ? `<th scope="row">${escapeHtml(String(cell))}</th>` : `<td>${escapeHtml(String(cell))}</td>`)).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  `;

  return `<table${summaryAttr}>${captionHtml}${theadHtml}${tbodyHtml}</table>`;
}

function escapeHtml(text: string): string {
  const div = { innerHTML: '' };
  const textNode = text;
  return textNode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// useChartKeyboardNav Hook
// ============================================================================

export interface UseChartKeyboardNavOptions {
  /** Total number of navigable points */
  totalPoints: number;
  /** Number of series */
  seriesCount?: number;
  /** Series identifiers */
  seriesIds?: string[];
  /** Callback when point is focused */
  onPointFocus?: (index: number, seriesId?: string) => void;
  /** Callback when point is selected/activated */
  onPointSelect?: (index: number, seriesId?: string) => void;
  /** Enable series navigation */
  enableSeriesNav?: boolean;
  /** Wrap around at ends */
  wrap?: boolean;
}

export interface UseChartKeyboardNavReturn {
  /** Current focused index */
  focusedIndex: number;
  /** Current focused series */
  focusedSeries: string | null;
  /** Whether chart is focused */
  isFocused: boolean;
  /** Handle keyboard events */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Handle focus events */
  handleFocus: () => void;
  /** Handle blur events */
  handleBlur: () => void;
  /** Set focused index programmatically */
  setFocusedIndex: (index: number) => void;
  /** Set focused series programmatically */
  setFocusedSeries: (seriesId: string | null) => void;
  /** Get ARIA props for a data point */
  getPointProps: (index: number, seriesId?: string) => {
    role: 'button';
    tabIndex: number;
    'aria-selected': boolean;
    'aria-label': string;
  };
}

/**
 * Hook for keyboard navigation within charts
 *
 * Provides keyboard navigation support for navigating between
 * data points using arrow keys, with series switching support.
 *
 * @param options - Navigation options
 * @returns Navigation state and handlers
 *
 * @example
 * ```tsx
 * const nav = useChartKeyboardNav({
 *   totalPoints: data.length,
 *   onPointFocus: (index) => showTooltip(data[index]),
 *   onPointSelect: (index) => selectPoint(data[index]),
 * });
 *
 * <svg onKeyDown={nav.handleKeyDown} onFocus={nav.handleFocus} onBlur={nav.handleBlur}>
 *   {data.map((d, i) => (
 *     <circle key={i} {...nav.getPointProps(i)} />
 *   ))}
 * </svg>
 * ```
 */
export function useChartKeyboardNav(
  options: UseChartKeyboardNavOptions
): UseChartKeyboardNavReturn {
  const {
    totalPoints,
    seriesCount = 1,
    seriesIds = [],
    onPointFocus,
    onPointSelect,
    enableSeriesNav = seriesCount > 1,
    wrap = true,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusedSeries, setFocusedSeries] = useState<string | null>(
    seriesIds[0] || null
  );
  const [isFocused, setIsFocused] = useState(false);

  // Notify on focus change
  useEffect(() => {
    if (isFocused && onPointFocus) {
      onPointFocus(focusedIndex, focusedSeries || undefined);
    }
  }, [focusedIndex, focusedSeries, isFocused, onPointFocus]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isFocused) return;

      let handled = true;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          setFocusedIndex((prev) => {
            const next = prev + 1;
            if (next >= totalPoints) {
              return wrap ? 0 : prev;
            }
            return next;
          });
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          setFocusedIndex((prev) => {
            const next = prev - 1;
            if (next < 0) {
              return wrap ? totalPoints - 1 : prev;
            }
            return next;
          });
          break;

        case 'Home':
          setFocusedIndex(0);
          break;

        case 'End':
          setFocusedIndex(totalPoints - 1);
          break;

        case 'Tab':
          if (enableSeriesNav && event.shiftKey) {
            // Navigate to previous series
            const currentSeriesIndex = seriesIds.indexOf(focusedSeries || '');
            if (currentSeriesIndex > 0) {
              setFocusedSeries(seriesIds[currentSeriesIndex - 1]);
              event.preventDefault();
            } else {
              handled = false;
            }
          } else if (enableSeriesNav) {
            // Navigate to next series
            const currentSeriesIndex = seriesIds.indexOf(focusedSeries || '');
            if (currentSeriesIndex < seriesIds.length - 1) {
              setFocusedSeries(seriesIds[currentSeriesIndex + 1]);
              event.preventDefault();
            } else {
              handled = false;
            }
          } else {
            handled = false;
          }
          break;

        case 'Enter':
        case ' ':
          if (onPointSelect) {
            onPointSelect(focusedIndex, focusedSeries || undefined);
          }
          break;

        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
      }
    },
    [
      isFocused,
      totalPoints,
      wrap,
      enableSeriesNav,
      seriesIds,
      focusedSeries,
      onPointSelect,
      focusedIndex,
    ]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const getPointProps = useCallback(
    (index: number, seriesId?: string) => ({
      role: 'button' as const,
      tabIndex: index === focusedIndex && seriesId === focusedSeries ? 0 : -1,
      'aria-selected': index === focusedIndex && seriesId === focusedSeries,
      'aria-label': `Data point ${index + 1}${seriesId ? ` in ${seriesId}` : ''}`,
    }),
    [focusedIndex, focusedSeries]
  );

  return {
    focusedIndex,
    focusedSeries,
    isFocused,
    handleKeyDown,
    handleFocus,
    handleBlur,
    setFocusedIndex,
    setFocusedSeries,
    getPointProps,
  };
}

// ============================================================================
// usePatternFills Hook
// ============================================================================

export interface UsePatternFillsOptions {
  /** Number of patterns needed */
  count: number;
  /** Base colors for patterns */
  colors?: string[];
  /** Pattern types to use */
  types?: PatternFill['type'][];
  /** Pattern stroke width */
  strokeWidth?: number;
  /** Pattern size */
  size?: number;
}

export interface UsePatternFillsReturn {
  /** Pattern definitions for SVG defs */
  patterns: PatternFill[];
  /** Get pattern ID for an index */
  getPatternId: (index: number) => string;
  /** Get pattern fill URL */
  getPatternUrl: (index: number) => string;
  /** Render pattern defs */
  PatternDefs: React.FC;
}

/**
 * Hook for generating SVG pattern fills for colorblind accessibility
 *
 * Creates distinguishable patterns that can be used alongside colors
 * to make chart elements accessible to colorblind users.
 *
 * @param options - Pattern options
 * @returns Pattern definitions and helper functions
 *
 * @example
 * ```tsx
 * const { getPatternUrl, PatternDefs } = usePatternFills({
 *   count: 5,
 *   colors: ['#4299e1', '#48bb78', '#ed8936'],
 * });
 *
 * return (
 *   <svg>
 *     <PatternDefs />
 *     {data.map((d, i) => (
 *       <rect fill={getPatternUrl(i)} />
 *     ))}
 *   </svg>
 * );
 * ```
 */
export function usePatternFills(options: UsePatternFillsOptions): UsePatternFillsReturn {
  const {
    count,
    colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565'],
    types = ['lines', 'dots', 'crosshatch', 'diagonal', 'horizontal', 'vertical', 'circles'],
    strokeWidth = 2,
    size = 8,
  } = options;

  const patternIdPrefix = useMemo(() => `pattern-${Math.random().toString(36).slice(2, 9)}`, []);

  const patterns = useMemo(() => {
    const result: PatternFill[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: `${patternIdPrefix}-${i}`,
        type: types[i % types.length],
        color: colors[i % colors.length],
        backgroundColor: 'transparent',
      });
    }
    return result;
  }, [count, colors, types, patternIdPrefix]);

  const getPatternId = useCallback(
    (index: number) => patterns[index % patterns.length].id,
    [patterns]
  );

  const getPatternUrl = useCallback(
    (index: number) => `url(#${getPatternId(index)})`,
    [getPatternId]
  );

  const PatternDefs: React.FC = useMemo(
    () =>
      function PatternDefsComponent() {
        return React.createElement(
          'defs',
          null,
          patterns.map((pattern) => {
            const { id, type, color, backgroundColor = 'transparent' } = pattern;
            
            const children: React.ReactNode[] = [
              React.createElement('rect', {
                key: 'bg',
                width: size,
                height: size,
                fill: backgroundColor,
              }),
            ];
            
            if (type === 'lines') {
              children.push(
                React.createElement('line', {
                  key: 'line',
                  x1: '0',
                  y1: size,
                  x2: size,
                  y2: '0',
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            } else if (type === 'dots') {
              children.push(
                React.createElement('circle', {
                  key: 'dot',
                  cx: size / 2,
                  cy: size / 2,
                  r: strokeWidth,
                  fill: color,
                })
              );
            } else if (type === 'crosshatch') {
              children.push(
                React.createElement('line', {
                  key: 'line1',
                  x1: '0',
                  y1: size,
                  x2: size,
                  y2: '0',
                  stroke: color,
                  strokeWidth: strokeWidth,
                }),
                React.createElement('line', {
                  key: 'line2',
                  x1: '0',
                  y1: '0',
                  x2: size,
                  y2: size,
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            } else if (type === 'diagonal') {
              children.push(
                React.createElement('line', {
                  key: 'diagonal',
                  x1: '0',
                  y1: size,
                  x2: size,
                  y2: '0',
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            } else if (type === 'horizontal') {
              children.push(
                React.createElement('line', {
                  key: 'horizontal',
                  x1: '0',
                  y1: size / 2,
                  x2: size,
                  y2: size / 2,
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            } else if (type === 'vertical') {
              children.push(
                React.createElement('line', {
                  key: 'vertical',
                  x1: size / 2,
                  y1: '0',
                  x2: size / 2,
                  y2: size,
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            } else if (type === 'circles') {
              children.push(
                React.createElement('circle', {
                  key: 'circle',
                  cx: size / 2,
                  cy: size / 2,
                  r: size / 3,
                  fill: 'none',
                  stroke: color,
                  strokeWidth: strokeWidth,
                })
              );
            }
            
            return React.createElement(
              'pattern',
              {
                key: id,
                id: id,
                patternUnits: 'userSpaceOnUse',
                width: size,
                height: size,
              },
              ...children
            );
          })
        );
      },
    [patterns, strokeWidth, size]
  );

  return {
    patterns,
    getPatternId,
    getPatternUrl,
    PatternDefs,
  };
}

/**
 * Generate SVG pattern definition element
 */
export function generatePatternDef(
  pattern: PatternFill,
  strokeWidth = 2,
  size = 8
): string {
  const { id, type, color, backgroundColor = 'transparent' } = pattern;

  let patternContent = '';

  switch (type) {
    case 'lines':
      patternContent = `
        <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;

    case 'dots':
      patternContent = `
        <circle cx="${size / 2}" cy="${size / 2}" r="${strokeWidth}" fill="${color}" />
      `;
      break;

    case 'crosshatch':
      patternContent = `
        <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="${strokeWidth}" />
        <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;

    case 'diagonal':
      patternContent = `
        <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;

    case 'horizontal':
      patternContent = `
        <line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;

    case 'vertical':
      patternContent = `
        <line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;

    case 'circles':
      patternContent = `
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      `;
      break;
  }

  return `
    <pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${backgroundColor}" />
      ${patternContent}
    </pattern>
  `;
}

// ============================================================================
// Accessibility Announcements
// ============================================================================

/**
 * Announce chart updates to screen readers
 */
export function announceChartUpdate(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('class', 'sr-only');
  announcer.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';

  document.body.appendChild(announcer);

  // Delay announcement slightly to ensure screen reader picks it up
  requestAnimationFrame(() => {
    announcer.textContent = message;

    // Remove announcer after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  });
}

/**
 * Generate announcement for data point
 */
export function generatePointAnnouncement(
  seriesName: string,
  xValue: string | number,
  yValue: number,
  index: number,
  total: number
): string {
  return `${seriesName}, point ${index + 1} of ${total}: X is ${xValue}, Y is ${yValue.toFixed(2)}`;
}

// ============================================================================
// Screen Reader Only Styles
// ============================================================================

/**
 * CSS-in-JS styles for screen reader only content
 */
export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * CSS class for screen reader only content
 */
export const srOnlyClassName = 'sr-only';
