/**
 * SafetyTimelineChart Component
 *
 * Multi-line time series chart for monitoring safety margins with:
 * - Mitigation state background color bands
 * - Constraint margin lines with threshold annotations
 * - OOD score line
 * - Severity indicator
 * - Real-time update support
 *
 * @module components/visualizations/safety-timeline-chart
 */

import * as React from 'react';
import { useRef, useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { scaleLinear, scaleTime, scaleOrdinal } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartDimensions, formatters } from '@/lib/visualizations/core';
import { useChartTheme, semanticColors } from '@/lib/visualizations/theme';
import { useChartA11y } from '@/lib/visualizations/a11y';
import type { SafetyTimelineProps } from '@/types/components';
import type { SafetyMarginTimeline, MitigationState } from '@/types/api';

// ============================================================================
// Types
// ============================================================================

interface TimelinePoint {
  timestamp: number;
  value: number;
}

interface TooltipDataType {
  point: SafetyMarginTimeline;
  x: number;
  y: number;
}

// ============================================================================
// Default State Colors
// ============================================================================

const defaultStateColors: Record<MitigationState, string> = {
  nominal: semanticColors.mitigation.nominal,
  cautious: semanticColors.mitigation.cautious,
  fallback: semanticColors.mitigation.fallback,
  safe_stop: semanticColors.mitigation.safe_stop,
  human_escalation: semanticColors.mitigation.human_escalation,
};

// ============================================================================
// State Band Component
// ============================================================================

function StateBands({
  data,
  xScale,
  height,
  stateColors,
}: {
  data: SafetyMarginTimeline[];
  xScale: ReturnType<typeof scaleTime<number>>;
  height: number;
  stateColors: Record<MitigationState, string>;
}) {
  // Group consecutive points by mitigation state
  const bands = useMemo(() => {
    if (data.length === 0) return [];

    const result: Array<{
      state: MitigationState;
      startTime: number;
      endTime: number;
    }> = [];

    let currentBand = {
      state: data[0].mitigation_state,
      startTime: data[0].timestamp,
      endTime: data[0].timestamp,
    };

    for (let i = 1; i < data.length; i++) {
      const point = data[i];
      if (point.mitigation_state === currentBand.state) {
        currentBand.endTime = point.timestamp;
      } else {
        result.push({ ...currentBand });
        currentBand = {
          state: point.mitigation_state,
          startTime: point.timestamp,
          endTime: point.timestamp,
        };
      }
    }
    result.push(currentBand);

    return result;
  }, [data]);

  return (
    <>
      {bands.map((band, i) => {
        const x1 = xScale(new Date(band.startTime));
        const x2 = xScale(new Date(band.endTime));
        const width = Math.max(x2 - x1, 2); // Minimum width of 2px

        return (
          <rect
            key={`band-${i}`}
            x={x1}
            y={0}
            width={width}
            height={height}
            fill={stateColors[band.state]}
            opacity={0.15}
          />
        );
      })}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SafetyTimelineChart({
  data,
  height,
  constraints,
  showOODScore = true,
  showSeverity = true,
  stateColors: customStateColors,
  timeRange,
  realtime = false,
  animated = true,
  title,
  description,
  className,
  'data-testid': testId,
}: SafetyTimelineProps & { animated?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useChartDimensions(containerRef, {
    top: 40,
    right: 80,
    bottom: 60,
    left: 60,
  });
  const { width, boundedWidth, boundedHeight, marginTop, marginLeft } = dimensions;
  const theme = useChartTheme();

  const stateColors = { ...defaultStateColors, ...customStateColors };

  // Tooltip
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<TooltipDataType>();

  // Determine constraints to show
  const constraintKeys = useMemo(() => {
    if (constraints && constraints.length > 0) return constraints;
    if (data.length === 0) return [];
    return Object.keys(data[0].constraint_margins);
  }, [constraints, data]);

  // Time scale
  const xScale = useMemo(() => {
    const times = data.map((d) => d.timestamp);
    const domain = timeRange
      ? timeRange
      : [new Date(Math.min(...times)), new Date(Math.max(...times))];

    return scaleTime({
      domain,
      range: [0, boundedWidth],
    });
  }, [data, timeRange, boundedWidth]);

  // Y scale for constraint margins (can be negative)
  const marginExtent = useMemo(() => {
    if (data.length === 0) return [-1, 1];
    let min = 0;
    let max = 0;
    data.forEach((d) => {
      Object.values(d.constraint_margins).forEach((v) => {
        min = Math.min(min, v);
        max = Math.max(max, v);
      });
    });
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [data]);

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: marginExtent,
        range: [boundedHeight, 0],
        nice: true,
      }),
    [marginExtent, boundedHeight]
  );

  // Y scale for OOD score (0-1)
  const oodScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 1],
        range: [boundedHeight, 0],
      }),
    [boundedHeight]
  );

  // Color scale for constraints
  const constraintColorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: constraintKeys,
        range: [
          '#3b82f6', // blue
          '#22c55e', // green
          '#f59e0b', // amber
          '#8b5cf6', // purple
          '#06b6d4', // cyan
          '#ec4899', // pink
        ],
      }),
    [constraintKeys]
  );

  // Bisector for tooltip
  const bisectDate = bisector<SafetyMarginTimeline, Date>((d) => new Date(d.timestamp)).left;

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const x = point.x;
      const xDate = xScale.invert(x);
      const index = bisectDate(data, xDate, 1);
      const d0 = data[index - 1];
      const d1 = data[index];

      if (!d0 && !d1) return;

      const d =
        !d1 ||
        (d0 && Math.abs(xDate.getTime() - d0.timestamp) < Math.abs(xDate.getTime() - d1.timestamp))
          ? d0
          : d1;

      if (!d) return;

      showTooltip({
        tooltipData: { point: d, x: xScale(new Date(d.timestamp)), y: point.y },
        tooltipLeft: xScale(new Date(d.timestamp)) + marginLeft,
        tooltipTop: point.y + marginTop,
      });
    },
    [data, xScale, marginLeft, marginTop, showTooltip, bisectDate]
  );

  // Accessibility
  const { chartProps, descriptionId, descriptionText } = useChartA11y({
    chartId: testId || 'safety-timeline-chart',
    title: title || 'Safety margin timeline',
    description:
      description ||
      `Time series showing ${constraintKeys.length} constraint margins over ${data.length} data points`,
    chartType: 'line',
  });

  if (width <= 0 || boundedWidth <= 0 || boundedHeight <= 0) {
    return (
      <div
        ref={containerRef}
        className={cn('w-full', className)}
        style={{ height }}
        data-testid={testId}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height }}
      data-testid={testId}
    >
      <svg width="100%" height={height} {...chartProps}>
        <Group left={marginLeft} top={marginTop}>
          {/* Mitigation state background bands */}
          <StateBands
            data={data}
            xScale={xScale}
            height={boundedHeight}
            stateColors={stateColors}
          />

          {/* Grid */}
          <GridRows
            scale={yScale}
            width={boundedWidth}
            stroke={theme.grid.color}
            strokeOpacity={theme.grid.opacity}
            strokeWidth={theme.grid.strokeWidth}
            numTicks={5}
          />

          {/* Zero line (safety threshold) */}
          <line
            x1={0}
            x2={boundedWidth}
            y1={yScale(0)}
            y2={yScale(0)}
            stroke={theme.colors.error}
            strokeWidth={2}
            strokeDasharray="8,4"
          />
          <text
            x={boundedWidth + 5}
            y={yScale(0)}
            dy="0.35em"
            fontSize={10}
            fill={theme.colors.error}
            fontWeight="bold"
          >
            Threshold
          </text>

          {/* Constraint margin lines */}
          {constraintKeys.map((constraintKey, i) => {
            const lineData = data.map((d) => ({
              timestamp: d.timestamp,
              value: d.constraint_margins[constraintKey] ?? 0,
            }));

            return (
              <LinePath
                key={`constraint-${constraintKey}`}
                data={lineData}
                x={(d) => xScale(new Date(d.timestamp))}
                y={(d) => yScale(d.value)}
                stroke={constraintColorScale(constraintKey)}
                strokeWidth={2}
                curve={curveMonotoneX}
              />
            );
          })}

          {/* OOD score line (uses right axis) */}
          {showOODScore && (
            <LinePath
              data={data}
              x={(d) => xScale(new Date(d.timestamp))}
              y={(d) => oodScale(d.ood_score)}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="4,4"
              curve={curveMonotoneX}
            />
          )}

          {/* Severity area (if showing) */}
          {showSeverity && (
            <AreaClosed
              data={data}
              x={(d) => xScale(new Date(d.timestamp))}
              y={(d) => oodScale(d.severity)}
              yScale={oodScale}
              fill="#ef4444"
              fillOpacity={0.1}
              curve={curveMonotoneX}
            />
          )}

          {/* Current state indicator (last point) */}
          {data.length > 0 && (
            <g>
              {constraintKeys.map((constraintKey) => {
                const lastPoint = data[data.length - 1];
                const value = lastPoint.constraint_margins[constraintKey] ?? 0;
                const color = constraintColorScale(constraintKey);

                return (
                  <motion.circle
                    key={`current-${constraintKey}`}
                    cx={xScale(new Date(lastPoint.timestamp))}
                    cy={yScale(value)}
                    r={realtime ? 6 : 4}
                    fill={color}
                    stroke={theme.colors.background}
                    strokeWidth={2}
                    animate={realtime ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                );
              })}
            </g>
          )}

          {/* Axes */}
          <AxisBottom
            scale={xScale}
            top={boundedHeight}
            stroke={theme.axis.lineColor}
            tickStroke={theme.axis.tickColor}
            tickLabelProps={() => ({
              fill: theme.axis.labelColor,
              fontSize: theme.typography.tickLabelSize,
              textAnchor: 'middle',
            })}
            label="Time"
            labelProps={{
              fill: theme.axis.titleColor,
              fontSize: theme.typography.axisLabelSize,
              textAnchor: 'middle',
            }}
            numTicks={6}
            tickFormat={(d) => formatters.date(d as Date, 'time')}
          />
          <AxisLeft
            scale={yScale}
            stroke={theme.axis.lineColor}
            tickStroke={theme.axis.tickColor}
            tickLabelProps={() => ({
              fill: theme.axis.labelColor,
              fontSize: theme.typography.tickLabelSize,
              textAnchor: 'end',
              dx: -4,
            })}
            label="Constraint Margin"
            labelProps={{
              fill: theme.axis.titleColor,
              fontSize: theme.typography.axisLabelSize,
              textAnchor: 'middle',
              angle: -90,
            }}
            numTicks={5}
          />

          {/* Right axis for OOD score */}
          {showOODScore && (
            <g transform={`translate(${boundedWidth}, 0)`}>
              <line
                y1={0}
                y2={boundedHeight}
                stroke={theme.axis.lineColor}
              />
              {[0, 0.5, 1].map((v) => (
                <g key={`ood-tick-${v}`} transform={`translate(0, ${oodScale(v)})`}>
                  <line x2={5} stroke={theme.axis.tickColor} />
                  <text
                    x={8}
                    dy="0.35em"
                    fontSize={9}
                    fill="#f97316"
                  >
                    {formatters.percent(v, 0)}
                  </text>
                </g>
              ))}
              <text
                transform={`translate(50, ${boundedHeight / 2}) rotate(90)`}
                textAnchor="middle"
                fontSize={10}
                fill="#f97316"
              >
                OOD Score
              </text>
            </g>
          )}

          {/* Tooltip trigger */}
          <rect
            width={boundedWidth}
            height={boundedHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={hideTooltip}
          />

          {/* Crosshair on hover */}
          {tooltipOpen && tooltipData && (
            <>
              <line
                x1={tooltipData.x}
                x2={tooltipData.x}
                y1={0}
                y2={boundedHeight}
                stroke={theme.colors.textMuted}
                strokeDasharray="4,4"
                strokeWidth={1}
                pointerEvents="none"
              />
            </>
          )}
        </Group>
      </svg>

      {/* Hidden description */}
      <div id={descriptionId} className="sr-only">
        {descriptionText}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-3">
        {constraintKeys.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-0.5"
              style={{ backgroundColor: constraintColorScale(key) }}
            />
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              {key}
            </span>
          </div>
        ))}
        {showOODScore && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-0.5"
              style={{ backgroundColor: '#f97316', borderStyle: 'dashed' }}
            />
            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
              OOD Score
            </span>
          </div>
        )}
      </div>

      {/* State legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {(Object.keys(stateColors) as MitigationState[]).map((state) => (
          <div key={state} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: stateColors[state], opacity: 0.5 }}
            />
            <span className="text-xs capitalize" style={{ color: theme.colors.textMuted }}>
              {state.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
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
            padding: '10px 14px',
            maxWidth: '280px',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">
                {formatters.date(tooltipData.point.timestamp, 'datetime')}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                style={{
                  backgroundColor: stateColors[tooltipData.point.mitigation_state],
                  color: 'white',
                }}
              >
                {tooltipData.point.mitigation_state.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-1 text-xs" style={{ color: theme.tooltip.secondaryTextColor }}>
              <div className="font-medium" style={{ color: theme.tooltip.textColor }}>
                Constraint Margins:
              </div>
              {Object.entries(tooltipData.point.constraint_margins).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <span>{key}:</span>
                  <span
                    className="font-medium"
                    style={{
                      color: value < 0 ? theme.colors.error : theme.tooltip.textColor,
                    }}
                  >
                    {formatters.number(value, 3)}
                  </span>
                </div>
              ))}

              {showOODScore && (
                <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: theme.colors.border }}>
                  <span>OOD Score:</span>
                  <span className="font-medium" style={{ color: '#f97316' }}>
                    {formatters.percent(tooltipData.point.ood_score, 1)}
                  </span>
                </div>
              )}

              {showSeverity && (
                <div className="flex justify-between gap-4">
                  <span>Severity:</span>
                  <span className="font-medium" style={{ color: theme.colors.error }}>
                    {formatters.percent(tooltipData.point.severity, 1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}
