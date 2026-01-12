/**
 * BarChart Component
 *
 * Flexible bar chart with vertical/horizontal orientation, stacking,
 * animations, and accessibility support.
 *
 * @module components/visualizations/charts/bar-chart
 */

import * as React from 'react';
import { useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { Group } from '@visx/group';
import { Bar, BarGroup, BarStack } from '@visx/shape';
import { AxisBottom, AxisLeft, AxisTop, AxisRight } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { LegendOrdinal } from '@visx/legend';
import { localPoint } from '@visx/event';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartDimensions, colorSchemes, formatters } from '@/lib/visualizations/core';
import { useChartTheme } from '@/lib/visualizations/theme';
import { useChartA11y, useChartKeyboardNav } from '@/lib/visualizations/a11y';
import type { BarChartProps, BarChartDataPoint } from '@/types/components';

// ============================================================================
// Types
// ============================================================================

interface BarChartContextValue {
  xScale: ReturnType<typeof scaleBand<string>>;
  yScale: ReturnType<typeof scaleLinear<number>>;
  colorScale: ReturnType<typeof scaleOrdinal<string, string>>;
  boundedWidth: number;
  boundedHeight: number;
  orientation: 'vertical' | 'horizontal';
  data: BarChartDataPoint[];
  animated: boolean;
  showTooltip: (event: React.MouseEvent, data: BarChartDataPoint) => void;
  hideTooltip: () => void;
}

interface BarChartCompoundProps {
  children: React.ReactNode;
  className?: string;
}

interface StackedBarData {
  category: string;
  [key: string]: number | string;
}

interface GroupedBarData {
  category: string;
  values: { key: string; value: number; color?: string }[];
}

// ============================================================================
// Context
// ============================================================================

const BarChartContext = createContext<BarChartContextValue | null>(null);

function useBarChartContext() {
  const context = useContext(BarChartContext);
  if (!context) {
    throw new Error('BarChart compound components must be used within BarChart.Root');
  }
  return context;
}

// ============================================================================
// Compound Components
// ============================================================================

/**
 * X-Axis component for BarChart
 */
function XAxis({
  label,
  tickFormat,
  tickCount,
  hideAxisLine,
  hideTicks,
}: {
  label?: string;
  tickFormat?: (value: string) => string;
  tickCount?: number;
  hideAxisLine?: boolean;
  hideTicks?: boolean;
}) {
  const { xScale, yScale, boundedHeight, orientation } = useBarChartContext();
  const theme = useChartTheme();

  if (orientation === 'horizontal') {
    return (
      <AxisBottom
        scale={yScale}
        top={boundedHeight}
        stroke={theme.axis.lineColor}
        tickStroke={hideTicks ? 'transparent' : theme.axis.tickColor}
        tickLength={hideTicks ? 0 : theme.axis.tickLength}
        numTicks={tickCount}
        tickLabelProps={() => ({
          fill: theme.axis.labelColor,
          fontSize: theme.typography.tickLabelSize,
          textAnchor: 'middle',
        })}
        label={label}
        labelProps={{
          fill: theme.axis.titleColor,
          fontSize: theme.typography.axisLabelSize,
          textAnchor: 'middle',
        }}
        hideAxisLine={hideAxisLine}
      />
    );
  }

  return (
    <AxisBottom
      scale={xScale}
      top={boundedHeight}
      stroke={theme.axis.lineColor}
      tickStroke={hideTicks ? 'transparent' : theme.axis.tickColor}
      tickLength={hideTicks ? 0 : theme.axis.tickLength}
      tickFormat={tickFormat}
      tickLabelProps={() => ({
        fill: theme.axis.labelColor,
        fontSize: theme.typography.tickLabelSize,
        textAnchor: 'middle',
      })}
      label={label}
      labelProps={{
        fill: theme.axis.titleColor,
        fontSize: theme.typography.axisLabelSize,
        textAnchor: 'middle',
      }}
      hideAxisLine={hideAxisLine}
    />
  );
}

/**
 * Y-Axis component for BarChart
 */
function YAxis({
  label,
  tickFormat,
  tickCount,
  hideAxisLine,
  hideTicks,
}: {
  label?: string;
  tickFormat?: (value: number) => string;
  tickCount?: number;
  hideAxisLine?: boolean;
  hideTicks?: boolean;
}) {
  const { xScale, yScale, orientation } = useBarChartContext();
  const theme = useChartTheme();

  if (orientation === 'horizontal') {
    return (
      <AxisLeft
        scale={xScale}
        stroke={theme.axis.lineColor}
        tickStroke={hideTicks ? 'transparent' : theme.axis.tickColor}
        tickLength={hideTicks ? 0 : theme.axis.tickLength}
        tickLabelProps={() => ({
          fill: theme.axis.labelColor,
          fontSize: theme.typography.tickLabelSize,
          textAnchor: 'end',
          dx: -4,
          dy: 4,
        })}
        label={label}
        labelProps={{
          fill: theme.axis.titleColor,
          fontSize: theme.typography.axisLabelSize,
          textAnchor: 'middle',
          angle: -90,
        }}
        hideAxisLine={hideAxisLine}
      />
    );
  }

  return (
    <AxisLeft
      scale={yScale}
      stroke={theme.axis.lineColor}
      tickStroke={hideTicks ? 'transparent' : theme.axis.tickColor}
      tickLength={hideTicks ? 0 : theme.axis.tickLength}
      numTicks={tickCount}
      tickFormat={tickFormat ? (v) => tickFormat(v as number) : undefined}
      tickLabelProps={() => ({
        fill: theme.axis.labelColor,
        fontSize: theme.typography.tickLabelSize,
        textAnchor: 'end',
        dx: -4,
        dy: 4,
      })}
      label={label}
      labelProps={{
        fill: theme.axis.titleColor,
        fontSize: theme.typography.axisLabelSize,
        textAnchor: 'middle',
        angle: -90,
      }}
      hideAxisLine={hideAxisLine}
    />
  );
}

/**
 * Grid component for BarChart
 */
function Grid({
  showHorizontal = true,
  showVertical = false,
}: {
  showHorizontal?: boolean;
  showVertical?: boolean;
}) {
  const { xScale, yScale, boundedWidth, boundedHeight } = useBarChartContext();
  const theme = useChartTheme();

  return (
    <>
      {showHorizontal && (
        <GridRows
          scale={yScale}
          width={boundedWidth}
          stroke={theme.grid.color}
          strokeOpacity={theme.grid.opacity}
          strokeWidth={theme.grid.strokeWidth}
          strokeDasharray={theme.grid.strokeDasharray}
        />
      )}
      {showVertical && (
        <GridColumns
          scale={xScale}
          height={boundedHeight}
          stroke={theme.grid.color}
          strokeOpacity={theme.grid.opacity}
          strokeWidth={theme.grid.strokeWidth}
          strokeDasharray={theme.grid.strokeDasharray}
        />
      )}
    </>
  );
}

/**
 * Bars component for BarChart
 */
function Bars({
  borderRadius = 4,
  hoverOpacity = 0.8,
}: {
  borderRadius?: number;
  hoverOpacity?: number;
}) {
  const { xScale, yScale, colorScale, boundedHeight, orientation, data, animated, showTooltip, hideTooltip } =
    useBarChartContext();

  const bars = useMemo(() => {
    return data.map((d, index) => {
      const label = d.label;
      const value = d.value;
      const color = d.color || colorScale(label);

      if (orientation === 'horizontal') {
        const barWidth = yScale(value);
        const barHeight = xScale.bandwidth();
        const x = 0;
        const y = xScale(label) ?? 0;

        return {
          key: label,
          x,
          y,
          width: barWidth,
          height: barHeight,
          color,
          data: d,
          index,
        };
      }

      const barWidth = xScale.bandwidth();
      const barHeight = boundedHeight - (yScale(value) ?? 0);
      const x = xScale(label) ?? 0;
      const y = yScale(value) ?? 0;

      return {
        key: label,
        x,
        y,
        width: barWidth,
        height: barHeight,
        color,
        data: d,
        index,
      };
    });
  }, [data, xScale, yScale, colorScale, boundedHeight, orientation]);

  if (!animated) {
    return (
      <>
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={bar.color}
            rx={borderRadius}
            onMouseMove={(event) => showTooltip(event, bar.data)}
            onMouseLeave={hideTooltip}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {bars.map((bar) => (
        <motion.rect
          key={bar.key}
          x={bar.x}
          y={orientation === 'horizontal' ? bar.y : boundedHeight}
          width={orientation === 'horizontal' ? 0 : bar.width}
          height={orientation === 'horizontal' ? bar.height : 0}
          fill={bar.color}
          rx={borderRadius}
          initial={false}
          animate={{
            x: bar.x,
            y: bar.y,
            width: bar.width,
            height: bar.height,
          }}
          exit={{
            [orientation === 'horizontal' ? 'width' : 'height']: 0,
            [orientation === 'horizontal' ? 'x' : 'y']: orientation === 'horizontal' ? 0 : boundedHeight,
          }}
          transition={{
            duration: 0.4,
            delay: bar.index * 0.05,
            ease: [0.4, 0, 0.2, 1],
          }}
          whileHover={{ opacity: hoverOpacity }}
          onMouseMove={(event: React.MouseEvent) => showTooltip(event, bar.data)}
          onMouseLeave={hideTooltip}
          style={{ cursor: 'pointer' }}
        />
      ))}
    </AnimatePresence>
  );
}

/**
 * Legend component for BarChart
 */
function Legend({
  position = 'bottom',
}: {
  position?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const { colorScale, data } = useBarChartContext();
  const theme = useChartTheme();

  // Create ordinal scale for legend
  const legendScale = scaleOrdinal({
    domain: data.map((d) => d.label),
    range: data.map((d, i) => d.color || colorScale(d.label)),
  });

  const direction = position === 'left' || position === 'right' ? 'column' : 'row';

  return (
    <div
      className={cn(
        'flex gap-4',
        direction === 'column' ? 'flex-col' : 'flex-row flex-wrap justify-center'
      )}
      style={{ marginTop: position === 'bottom' ? theme.spacing.md : 0 }}
    >
      <LegendOrdinal
        scale={legendScale}
        direction={direction}
        labelMargin="0 0 0 4px"
        style={{
          display: 'flex',
          gap: theme.spacing.md,
          flexDirection: direction,
        }}
      />
    </div>
  );
}

// ============================================================================
// Root Component
// ============================================================================

interface BarChartRootProps extends BarChartProps {
  children?: React.ReactNode;
}

function BarChartRoot({
  data,
  height,
  margin,
  orientation = 'vertical',
  xAxis,
  yAxis,
  stacked = false,
  borderRadius = 4,
  padding = 0.2,
  showGrid = true,
  showTooltip: enableTooltip = true,
  showLegend = false,
  colorScheme = colorSchemes.categorical,
  animated = true,
  title,
  description,
  className,
  children,
  'data-testid': testId,
}: BarChartRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useChartDimensions(containerRef, margin);
  const { boundedWidth, boundedHeight, marginTop, marginLeft } = dimensions;
  const theme = useChartTheme();

  // Tooltip
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<BarChartDataPoint>();

  // Scales
  const xScale = useMemo(() => {
    if (orientation === 'horizontal') {
      return scaleBand({
        domain: data.map((d) => d.label),
        range: [0, boundedHeight],
        padding,
      });
    }
    return scaleBand({
      domain: data.map((d) => d.label),
      range: [0, boundedWidth],
      padding,
    });
  }, [data, boundedWidth, boundedHeight, padding, orientation]);

  const yScale = useMemo(() => {
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, 0);

    if (orientation === 'horizontal') {
      return scaleLinear({
        domain: [0, maxValue * 1.1],
        range: [0, boundedWidth],
        nice: true,
      });
    }
    return scaleLinear({
      domain: [0, maxValue * 1.1],
      range: [boundedHeight, 0],
      nice: true,
    });
  }, [data, boundedWidth, boundedHeight, orientation]);

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.map((d) => d.label),
        range: colorScheme,
      }),
    [data, colorScheme]
  );

  // Handle tooltip
  const handleShowTooltip = useCallback(
    (event: React.MouseEvent, d: BarChartDataPoint) => {
      if (!enableTooltip) return;
      const point = localPoint(event);
      if (!point) return;
      showTooltip({
        tooltipData: d,
        tooltipLeft: point.x,
        tooltipTop: point.y,
      });
    },
    [enableTooltip, showTooltip]
  );

  // Accessibility
  const { chartProps, descriptionId, descriptionText } = useChartA11y({
    chartId: testId || 'bar-chart',
    title: title || 'Bar chart',
    description,
    chartType: 'bar',
  });

  // Keyboard navigation
  const keyboard = useChartKeyboardNav({
    totalPoints: data.length,
    onPointFocus: (index) => {
      // Highlight bar on focus
    },
    onPointSelect: (index) => {
      // Handle bar selection
    },
  });

  const contextValue: BarChartContextValue = {
    xScale,
    yScale,
    colorScale,
    boundedWidth,
    boundedHeight,
    orientation,
    data,
    animated,
    showTooltip: handleShowTooltip,
    hideTooltip,
  };

  if (boundedWidth <= 0 || boundedHeight <= 0) {
    return (
      <div
        ref={containerRef}
        className={cn('w-full', className)}
        style={{ height }}
        data-testid={testId}
      />
    );
  }

  // Default children if none provided
  const chartContent = children || (
    <>
      {showGrid && <Grid />}
      <Bars borderRadius={borderRadius} />
      <XAxis label={xAxis?.label} />
      <YAxis label={yAxis?.label} />
    </>
  );

  return (
    <BarChartContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn('relative', className)}
        style={{ height }}
        data-testid={testId}
      >
        <svg
          width="100%"
          height={height}
          {...chartProps}
          onKeyDown={keyboard.handleKeyDown}
          onFocus={keyboard.handleFocus}
          onBlur={keyboard.handleBlur}
        >
          <Group left={marginLeft} top={marginTop}>
            {chartContent}
          </Group>
        </svg>

        {/* Hidden description for screen readers */}
        <div id={descriptionId} className="sr-only">
          {descriptionText}
        </div>

        {/* Legend */}
        {showLegend && <Legend />}

        {/* Tooltip */}
        {enableTooltip && tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            style={{
              ...defaultStyles,
              backgroundColor: theme.tooltip.backgroundColor,
              color: theme.tooltip.textColor,
              border: `${theme.tooltip.borderWidth}px solid ${theme.tooltip.borderColor}`,
              borderRadius: theme.tooltip.borderRadius,
              boxShadow: theme.tooltip.boxShadow,
              padding: '8px 12px',
            }}
          >
            <div className="text-sm">
              <div className="font-medium">{tooltipData.label}</div>
              <div style={{ color: theme.tooltip.secondaryTextColor }}>
                {formatters.number(tooltipData.value)}
              </div>
            </div>
          </TooltipWithBounds>
        )}
      </div>
    </BarChartContext.Provider>
  );
}

// ============================================================================
// Compound Component Export
// ============================================================================

/**
 * BarChart with compound component pattern
 *
 * @example
 * ```tsx
 * // Simple usage
 * <BarChart
 *   data={[
 *     { label: 'A', value: 10 },
 *     { label: 'B', value: 20 },
 *   ]}
 *   height={300}
 * />
 *
 * // Compound component usage
 * <BarChart.Root data={data} height={300}>
 *   <BarChart.Grid />
 *   <BarChart.Bars borderRadius={8} />
 *   <BarChart.XAxis label="Categories" />
 *   <BarChart.YAxis label="Values" />
 *   <BarChart.Legend position="right" />
 * </BarChart.Root>
 * ```
 */
export const BarChart = Object.assign(BarChartRoot, {
  Root: BarChartRoot,
  XAxis,
  YAxis,
  Grid,
  Bars,
  Legend,
});

export type { BarChartDataPoint };
