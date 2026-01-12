/**
 * LineChart Component
 *
 * Flexible line chart with multi-series support, compound component pattern,
 * tooltips, brush selection, keyboard navigation, and accessibility.
 *
 * @module components/visualizations/charts/line-chart
 */

import * as React from 'react';
import { useRef, useMemo, useCallback, createContext, useContext, useState } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed, Circle } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleLinear, scaleTime } from '@visx/scale';
import { curveLinear, curveMonotoneX, curveStep, curveNatural } from '@visx/curve';
import { localPoint } from '@visx/event';
import { Brush } from '@visx/brush';
import { PatternLines } from '@visx/pattern';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { bisector } from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartDimensions, colorSchemes, formatters } from '@/lib/visualizations/core';
import { useChartTheme } from '@/lib/visualizations/theme';
import { useChartA11y, useChartKeyboardNav, announceChartUpdate } from '@/lib/visualizations/a11y';
import type { LineChartProps, LineChartDataPoint, LineChartSeries } from '@/types/components';

// ============================================================================
// Types
// ============================================================================

type CurveType = 'linear' | 'monotone' | 'step' | 'natural';

interface LineChartContextValue {
  xScale: ReturnType<typeof scaleLinear<number>> | ReturnType<typeof scaleTime<number>>;
  yScale: ReturnType<typeof scaleLinear<number>>;
  boundedWidth: number;
  boundedHeight: number;
  series: LineChartSeries[];
  colorScheme: string[];
  curveFunction: typeof curveLinear;
  animated: boolean;
  showTooltip: (event: React.MouseEvent, series: LineChartSeries, point: LineChartDataPoint) => void;
  hideTooltip: () => void;
  focusedPoint: { seriesId: string; pointIndex: number } | null;
  setFocusedPoint: (point: { seriesId: string; pointIndex: number } | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CURVE_MAP = {
  linear: curveLinear,
  monotone: curveMonotoneX,
  step: curveStep,
  natural: curveNatural,
};

// ============================================================================
// Accessors
// ============================================================================

const getX = (d: LineChartDataPoint) => d.x;
const getY = (d: LineChartDataPoint) => d.y;

// ============================================================================
// Context
// ============================================================================

const LineChartContext = createContext<LineChartContextValue | null>(null);

function useLineChartContext() {
  const context = useContext(LineChartContext);
  if (!context) {
    throw new Error('LineChart compound components must be used within LineChart.Root');
  }
  return context;
}

// ============================================================================
// Compound Components
// ============================================================================

/**
 * X-Axis component for LineChart
 */
function XAxis({
  label,
  tickFormat,
  tickCount = 5,
  hideAxisLine,
  hideTicks,
}: {
  label?: string;
  tickFormat?: (value: number | Date) => string;
  tickCount?: number;
  hideAxisLine?: boolean;
  hideTicks?: boolean;
}) {
  const { xScale, boundedHeight } = useLineChartContext();
  const theme = useChartTheme();

  return (
    <AxisBottom
      scale={xScale}
      top={boundedHeight}
      stroke={theme.axis.lineColor}
      tickStroke={hideTicks ? 'transparent' : theme.axis.tickColor}
      tickLength={hideTicks ? 0 : theme.axis.tickLength}
      numTicks={tickCount}
      tickFormat={tickFormat ? (v) => tickFormat(v as number | Date) : undefined}
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
 * Y-Axis component for LineChart
 */
function YAxis({
  label,
  tickFormat,
  tickCount = 5,
  hideAxisLine,
  hideTicks,
}: {
  label?: string;
  tickFormat?: (value: number) => string;
  tickCount?: number;
  hideAxisLine?: boolean;
  hideTicks?: boolean;
}) {
  const { yScale } = useLineChartContext();
  const theme = useChartTheme();

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
 * Grid component for LineChart
 */
function Grid({
  showHorizontal = true,
  showVertical = true,
}: {
  showHorizontal?: boolean;
  showVertical?: boolean;
}) {
  const { xScale, yScale, boundedWidth, boundedHeight } = useLineChartContext();
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
 * Line component for LineChart - renders the line paths
 */
function Line({
  strokeWidth = 2,
  strokeDasharray,
}: {
  strokeWidth?: number;
  strokeDasharray?: string;
}) {
  const { xScale, yScale, series, colorScheme, curveFunction, animated } = useLineChartContext();

  if (!animated) {
    return (
      <>
        {series.map((s, i) => (
          <LinePath
            key={`line-${s.id}`}
            data={s.data}
            x={(d) => xScale(getX(d)) ?? 0}
            y={(d) => yScale(getY(d)) ?? 0}
            curve={curveFunction}
            stroke={s.color ?? colorScheme[i % colorScheme.length]}
            strokeWidth={s.strokeWidth ?? strokeWidth}
            strokeDasharray={s.strokeDasharray ?? strokeDasharray}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }

  return (
    <>
      {series.map((s, i) => {
        const color = s.color ?? colorScheme[i % colorScheme.length];
        const lineData = s.data.map((d) => ({
          x: xScale(getX(d)) ?? 0,
          y: yScale(getY(d)) ?? 0,
        }));

        // Create path string
        const pathD = lineData
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');

        return (
          <motion.path
            key={`line-${s.id}`}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={s.strokeWidth ?? strokeWidth}
            strokeDasharray={s.strokeDasharray ?? strokeDasharray}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />
        );
      })}
    </>
  );
}

/**
 * Area component for LineChart - renders filled areas under lines
 */
function Area({
  fillOpacity = 0.2,
}: {
  fillOpacity?: number;
}) {
  const { xScale, yScale, series, colorScheme, curveFunction, boundedHeight } = useLineChartContext();

  return (
    <>
      {series.map((s, i) => (
        <AreaClosed
          key={`area-${s.id}`}
          data={s.data}
          x={(d) => xScale(getX(d)) ?? 0}
          y={(d) => yScale(getY(d)) ?? 0}
          yScale={yScale}
          curve={curveFunction}
          fill={s.color ?? colorScheme[i % colorScheme.length]}
          fillOpacity={fillOpacity}
          strokeWidth={0}
        />
      ))}
    </>
  );
}

/**
 * Points component for LineChart - renders data points
 */
function Points({
  radius = 4,
  showOnHover = false,
}: {
  radius?: number;
  showOnHover?: boolean;
}) {
  const { xScale, yScale, series, colorScheme, showTooltip, hideTooltip, focusedPoint } = useLineChartContext();
  const theme = useChartTheme();

  return (
    <>
      {series.map((s, seriesIndex) =>
        s.data.map((d, pointIndex) => {
          const isFocused = focusedPoint?.seriesId === s.id && focusedPoint?.pointIndex === pointIndex;
          const color = s.color ?? colorScheme[seriesIndex % colorScheme.length];

          return (
            <circle
              key={`point-${s.id}-${pointIndex}`}
              cx={xScale(getX(d))}
              cy={yScale(getY(d))}
              r={isFocused ? radius + 2 : radius}
              fill={color}
              stroke={theme.colors.background}
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(event) => showTooltip(event, s, d)}
              onMouseLeave={hideTooltip}
            />
          );
        })
      )}
    </>
  );
}

/**
 * Tooltip trigger component - invisible overlay for tooltip
 */
function TooltipTrigger() {
  const { xScale, yScale, boundedWidth, boundedHeight, series, showTooltip, hideTooltip } = useLineChartContext();

  const bisectDate = bisector<LineChartDataPoint, number | Date>((d) => d.x).left;

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const x = point.x;
      const xValue = xScale.invert(x);

      // Find closest point across all series
      let closestSeries: LineChartSeries | null = null;
      let closestPoint: LineChartDataPoint | null = null;
      let minDistance = Infinity;

      series.forEach((s) => {
        const index = bisectDate(s.data, xValue, 1);
        const d0 = s.data[index - 1];
        const d1 = s.data[index];

        if (!d0 && !d1) return;

        const d = !d1 || (d0 && Math.abs(Number(xValue) - Number(d0.x)) < Math.abs(Number(xValue) - Number(d1.x))) ? d0 : d1;
        if (!d) return;

        const yPos = yScale(d.y);
        const distance = Math.abs(point.y - yPos);

        if (distance < minDistance) {
          minDistance = distance;
          closestSeries = s;
          closestPoint = d;
        }
      });

      if (closestSeries && closestPoint) {
        showTooltip(event, closestSeries, closestPoint);
      }
    },
    [series, xScale, yScale, showTooltip, bisectDate]
  );

  return (
    <rect
      width={boundedWidth}
      height={boundedHeight}
      fill="transparent"
      onMouseMove={handleMouseMove}
      onMouseLeave={hideTooltip}
    />
  );
}

/**
 * Legend component for LineChart
 */
function Legend({
  position = 'bottom',
}: {
  position?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const { series, colorScheme } = useLineChartContext();
  const theme = useChartTheme();

  const direction = position === 'left' || position === 'right' ? 'column' : 'row';

  return (
    <div
      className={cn(
        'flex gap-4',
        direction === 'column' ? 'flex-col' : 'flex-row flex-wrap justify-center'
      )}
      style={{ marginTop: position === 'bottom' ? theme.spacing.md : 0 }}
    >
      {series.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: s.color ?? colorScheme[i % colorScheme.length] }}
          />
          <span
            className="text-sm"
            style={{ color: theme.axis.labelColor }}
          >
            {s.name}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Brush component for LineChart - range selection
 */
function BrushComponent({
  onBrushChange,
  brushHeight = 60,
}: {
  onBrushChange?: (domain: [number, number] | null) => void;
  brushHeight?: number;
}) {
  const { xScale, yScale, boundedWidth, boundedHeight } = useLineChartContext();

  const handleBrushChange = useCallback(
    (domain: { x0: number; x1: number } | null) => {
      if (!onBrushChange) return;
      if (!domain) {
        onBrushChange(null);
        return;
      }
      const x0 = xScale.invert(domain.x0);
      const x1 = xScale.invert(domain.x1);
      onBrushChange([Number(x0), Number(x1)]);
    },
    [onBrushChange, xScale]
  );

  return (
    <Brush
      xScale={xScale}
      yScale={yScale}
      width={boundedWidth}
      height={boundedHeight}
      handleSize={8}
      resizeTriggerAreas={['left', 'right']}
      brushDirection="horizontal"
      onChange={(domain) => {
        if (domain) {
          handleBrushChange({ x0: domain.x0, x1: domain.x1 });
        } else {
          handleBrushChange(null);
        }
      }}
      selectedBoxStyle={{
        fill: 'currentColor',
        fillOpacity: 0.1,
        stroke: 'currentColor',
        strokeWidth: 1,
      }}
    />
  );
}

// ============================================================================
// Root Component
// ============================================================================

interface LineChartRootProps extends LineChartProps {
  children?: React.ReactNode;
}

function LineChartRoot({
  series,
  height,
  margin,
  xAxis,
  yAxis,
  enableBrush = false,
  onBrushChange,
  showArea = false,
  showPoints = false,
  showGrid = true,
  showTooltip: enableTooltip = true,
  showLegend = true,
  curve = 'monotone',
  colorScheme: colorSchemeProp = colorSchemes.categorical,
  animated = true,
  title,
  description,
  className,
  children,
  'data-testid': testId,
}: LineChartRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useChartDimensions(containerRef, margin);
  const { boundedWidth, boundedHeight, marginTop, marginLeft } = dimensions;
  const theme = useChartTheme();

  const [focusedPoint, setFocusedPoint] = useState<{ seriesId: string; pointIndex: number } | null>(null);

  // Tooltip
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<{ series: LineChartSeries; point: LineChartDataPoint }>();

  // Scales
  const xScale = useMemo(() => {
    const allPoints = series.flatMap((s) => s.data);
    const xValues = allPoints.map(getX);
    const isTime = xValues[0] instanceof Date;

    const domain = isTime
      ? [
          Math.min(...xValues.map((d) => (d as Date).getTime())),
          Math.max(...xValues.map((d) => (d as Date).getTime())),
        ]
      : [Math.min(...(xValues as number[])), Math.max(...(xValues as number[]))];

    return (isTime ? scaleTime : scaleLinear)({
      domain: isTime ? domain.map((d) => new Date(d)) : domain,
      range: [0, boundedWidth],
      nice: true,
    });
  }, [series, boundedWidth]);

  const yScale = useMemo(() => {
    const allPoints = series.flatMap((s) => s.data);
    const yValues = allPoints.map(getY);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const padding = (yMax - yMin) * 0.1;

    return scaleLinear({
      domain: [Math.max(0, yMin - padding), yMax + padding],
      range: [boundedHeight, 0],
      nice: true,
    });
  }, [series, boundedHeight]);

  // Get curve function
  const curveFunction = CURVE_MAP[curve] ?? curveMonotoneX;

  // Handle tooltip
  const handleShowTooltip = useCallback(
    (event: React.MouseEvent, s: LineChartSeries, point: LineChartDataPoint) => {
      if (!enableTooltip) return;
      showTooltip({
        tooltipData: { series: s, point },
        tooltipLeft: xScale(getX(point)) + marginLeft,
        tooltipTop: yScale(getY(point)) + marginTop,
      });
    },
    [enableTooltip, showTooltip, xScale, yScale, marginLeft, marginTop]
  );

  // Accessibility
  const { chartProps, descriptionId, descriptionText } = useChartA11y({
    chartId: testId || 'line-chart',
    title: title || 'Line chart',
    description,
    chartType: 'line',
    series: series.map((s) => ({
      id: s.id,
      name: s.name,
      data: s.data.map((d) => ({ x: getX(d), y: getY(d) })),
    })),
  });

  // Keyboard navigation
  const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);
  const keyboard = useChartKeyboardNav({
    totalPoints,
    seriesCount: series.length,
    seriesIds: series.map((s) => s.id),
    enableSeriesNav: series.length > 1,
    onPointFocus: (index, seriesId) => {
      const s = series.find((s) => s.id === seriesId) || series[0];
      if (s && s.data[index]) {
        setFocusedPoint({ seriesId: s.id, pointIndex: index });
        const point = s.data[index];
        announceChartUpdate(
          `${s.name}, point ${index + 1}: ${typeof point.x === 'number' ? point.x : formatters.date(point.x as Date)}, ${formatters.number(point.y)}`
        );
      }
    },
    onPointSelect: (index, seriesId) => {
      // Handle point selection
    },
  });

  const contextValue: LineChartContextValue = {
    xScale,
    yScale,
    boundedWidth,
    boundedHeight,
    series,
    colorScheme: colorSchemeProp,
    curveFunction,
    animated,
    showTooltip: handleShowTooltip,
    hideTooltip,
    focusedPoint,
    setFocusedPoint,
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
      {/* Gradients for areas */}
      {showArea &&
        series.map((s, i) => (
          <LinearGradient
            key={`gradient-${s.id}`}
            id={`area-gradient-${s.id}`}
            from={s.color ?? colorSchemeProp[i % colorSchemeProp.length]}
            to={s.color ?? colorSchemeProp[i % colorSchemeProp.length]}
            fromOpacity={0.3}
            toOpacity={0.05}
          />
        ))}

      {showGrid && <Grid />}
      {showArea && <Area />}
      <Line />
      {showPoints && <Points />}
      <XAxis label={xAxis?.label} />
      <YAxis label={yAxis?.label} />
      {enableBrush && <BrushComponent onBrushChange={onBrushChange} />}
      <TooltipTrigger />
    </>
  );

  return (
    <LineChartContext.Provider value={contextValue}>
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
        {showLegend && series.length > 1 && <Legend />}

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
              <div className="font-medium">{tooltipData.series.name}</div>
              <div style={{ color: theme.tooltip.secondaryTextColor }}>
                {typeof tooltipData.point.x === 'number'
                  ? formatters.number(tooltipData.point.x)
                  : formatters.date(tooltipData.point.x)}
                : {formatters.number(tooltipData.point.y)}
              </div>
            </div>
          </TooltipWithBounds>
        )}
      </div>
    </LineChartContext.Provider>
  );
}

// ============================================================================
// Compound Component Export
// ============================================================================

/**
 * LineChart with compound component pattern
 *
 * @example
 * ```tsx
 * // Simple usage
 * <LineChart
 *   series={[{ id: '1', name: 'Sales', data: [...] }]}
 *   height={400}
 * />
 *
 * // Compound component usage for full customization
 * <LineChart.Root series={series} height={400}>
 *   <LineChart.Grid showVertical={false} />
 *   <LineChart.Area fillOpacity={0.3} />
 *   <LineChart.Line strokeWidth={3} />
 *   <LineChart.Points radius={5} />
 *   <LineChart.XAxis label="Date" />
 *   <LineChart.YAxis label="Value" />
 *   <LineChart.TooltipTrigger />
 *   <LineChart.Legend position="right" />
 *   <LineChart.Brush onBrushChange={handleBrush} />
 * </LineChart.Root>
 * ```
 */
export const LineChart = Object.assign(LineChartRoot, {
  Root: LineChartRoot,
  XAxis,
  YAxis,
  Grid,
  Line,
  Area,
  Points,
  TooltipTrigger,
  Legend,
  Brush: BrushComponent,
});

export type { LineChartDataPoint, LineChartSeries, CurveType };
