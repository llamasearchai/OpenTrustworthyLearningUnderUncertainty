/**
 * CalibrationChart Component
 *
 * Reliability diagram for visualizing model calibration with:
 * - Calibration curve (confidence vs accuracy)
 * - Perfect calibration diagonal reference line
 * - Histogram of prediction counts per bin
 * - ECE (Expected Calibration Error) annotation
 *
 * @module components/visualizations/calibration-chart
 */

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar, LinePath, Circle } from '@visx/shape';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartDimensions, formatters } from '@/lib/visualizations/core';
import { useChartTheme, semanticColors } from '@/lib/visualizations/theme';
import { useChartA11y } from '@/lib/visualizations/a11y';
import type { CalibrationChartProps } from '@/types/components';

// ============================================================================
// Types
// ============================================================================

interface CalibrationBin {
  confidence: number;
  accuracy: number;
  count: number;
}

interface TooltipDataType {
  bin: CalibrationBin;
  index: number;
}

// ============================================================================
// Calibration Status
// ============================================================================

type CalibrationStatus = 'well-calibrated' | 'overconfident' | 'underconfident';

function getCalibrationStatus(confidence: number, accuracy: number): CalibrationStatus {
  const diff = confidence - accuracy;
  if (Math.abs(diff) < 0.05) return 'well-calibrated';
  if (diff > 0) return 'overconfident';
  return 'underconfident';
}

function getStatusColor(status: CalibrationStatus): string {
  switch (status) {
    case 'well-calibrated':
      return semanticColors.calibration.wellCalibrated;
    case 'overconfident':
      return semanticColors.calibration.overconfident;
    case 'underconfident':
      return semanticColors.calibration.underconfident;
  }
}

// ============================================================================
// ECE Calculation
// ============================================================================

function calculateECE(bins: CalibrationBin[]): number {
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (totalCount === 0) return 0;

  return bins.reduce((ece, bin) => {
    const weight = bin.count / totalCount;
    const error = Math.abs(bin.accuracy - bin.confidence);
    return ece + weight * error;
  }, 0);
}

// ============================================================================
// Main Component
// ============================================================================

export function CalibrationChart({
  bins,
  ece: providedECE,
  height,
  showPerfectLine = true,
  showHistogram = true,
  animated = true,
  title,
  description,
  className,
  'data-testid': testId,
}: CalibrationChartProps & { animated?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useChartDimensions(containerRef, {
    top: 40,
    right: showHistogram ? 60 : 40,
    bottom: 60,
    left: 60,
  });
  const { width, boundedWidth, boundedHeight, marginTop, marginLeft } = dimensions;
  const theme = useChartTheme();

  // Calculate ECE if not provided
  const ece = providedECE ?? calculateECE(bins);

  // Tooltip
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
  } = useTooltip<TooltipDataType>();

  // Calculate histogram height (bottom portion of chart)
  const histogramHeight = showHistogram ? boundedHeight * 0.25 : 0;
  const mainChartHeight = boundedHeight - histogramHeight - (showHistogram ? 20 : 0);

  // Scales for main calibration chart
  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 1],
        range: [0, boundedWidth],
      }),
    [boundedWidth]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, 1],
        range: [mainChartHeight, 0],
      }),
    [mainChartHeight]
  );

  // Scales for histogram
  const histXScale = useMemo(
    () =>
      scaleBand({
        domain: bins.map((_, i) => String(i)),
        range: [0, boundedWidth],
        padding: 0.2,
      }),
    [bins, boundedWidth]
  );

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const histYScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, maxCount],
        range: [histogramHeight, 0],
        nice: true,
      }),
    [maxCount, histogramHeight]
  );

  // Accessibility
  const { chartProps, descriptionId, descriptionText } = useChartA11y({
    chartId: testId || 'calibration-chart',
    title: title || 'Calibration reliability diagram',
    description:
      description ||
      `Model calibration chart with ${bins.length} bins. Expected Calibration Error (ECE): ${(ece * 100).toFixed(2)}%`,
    chartType: 'other',
  });

  // Handle tooltip
  const handleMouseEnter = (event: React.MouseEvent, bin: CalibrationBin, index: number) => {
    const point = localPoint(event);
    if (!point) return;
    showTooltip({
      tooltipData: { bin, index },
      tooltipLeft: point.x,
      tooltipTop: point.y,
    });
  };

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
          {/* Grid */}
          <GridRows
            scale={yScale}
            width={boundedWidth}
            stroke={theme.grid.color}
            strokeOpacity={theme.grid.opacity}
            strokeWidth={theme.grid.strokeWidth}
            numTicks={5}
          />
          <GridColumns
            scale={xScale}
            height={mainChartHeight}
            stroke={theme.grid.color}
            strokeOpacity={theme.grid.opacity}
            strokeWidth={theme.grid.strokeWidth}
            numTicks={5}
          />

          {/* Perfect calibration diagonal */}
          {showPerfectLine && (
            <LinePath
              data={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              x={(d) => xScale(d.x)}
              y={(d) => yScale(d.y)}
              stroke={theme.colors.textMuted}
              strokeWidth={2}
              strokeDasharray="8,4"
              strokeOpacity={0.7}
            />
          )}

          {/* Calibration error areas (gap visualization) */}
          {bins.map((bin, i) => {
            const x = xScale(bin.confidence);
            const yAccuracy = yScale(bin.accuracy);
            const yConfidence = yScale(bin.confidence);
            const status = getCalibrationStatus(bin.confidence, bin.accuracy);
            const color = getStatusColor(status);

            if (Math.abs(bin.accuracy - bin.confidence) < 0.01) return null;

            return (
              <motion.rect
                key={`error-${i}`}
                x={x - 4}
                y={Math.min(yAccuracy, yConfidence)}
                width={8}
                height={Math.abs(yAccuracy - yConfidence)}
                fill={color}
                opacity={0.2}
                initial={animated ? { opacity: 0 } : false}
                animate={{ opacity: 0.2 }}
                transition={{ delay: i * 0.05 }}
              />
            );
          })}

          {/* Calibration curve */}
          <LinePath
            data={bins}
            x={(d) => xScale(d.confidence)}
            y={(d) => yScale(d.accuracy)}
            stroke={theme.colors.primary}
            strokeWidth={3}
            curve={curveMonotoneX}
          />

          {/* Data points */}
          {bins.map((bin, i) => {
            const status = getCalibrationStatus(bin.confidence, bin.accuracy);
            const color = getStatusColor(status);

            return (
              <motion.g
                key={`point-${i}`}
                initial={animated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <circle
                  cx={xScale(bin.confidence)}
                  cy={yScale(bin.accuracy)}
                  r={Math.max(4, Math.min(12, Math.sqrt(bin.count / maxCount) * 12))}
                  fill={color}
                  stroke={theme.colors.background}
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleMouseEnter(e, bin, i)}
                  onMouseLeave={hideTooltip}
                />
              </motion.g>
            );
          })}

          {/* Main chart axes */}
          <AxisBottom
            scale={xScale}
            top={mainChartHeight}
            stroke={theme.axis.lineColor}
            tickStroke={theme.axis.tickColor}
            tickLabelProps={() => ({
              fill: theme.axis.labelColor,
              fontSize: theme.typography.tickLabelSize,
              textAnchor: 'middle',
            })}
            label="Confidence"
            labelProps={{
              fill: theme.axis.titleColor,
              fontSize: theme.typography.axisLabelSize,
              textAnchor: 'middle',
            }}
            numTicks={5}
            tickFormat={(v) => formatters.percent(v as number, 0)}
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
            label="Accuracy"
            labelProps={{
              fill: theme.axis.titleColor,
              fontSize: theme.typography.axisLabelSize,
              textAnchor: 'middle',
              angle: -90,
            }}
            numTicks={5}
            tickFormat={(v) => formatters.percent(v as number, 0)}
          />

          {/* Histogram */}
          {showHistogram && (
            <Group top={mainChartHeight + 20}>
              {/* Histogram bars */}
              {bins.map((bin, i) => {
                const barWidth = histXScale.bandwidth();
                const barHeight = histogramHeight - histYScale(bin.count);
                const x = histXScale(String(i)) ?? 0;
                const y = histYScale(bin.count);

                return (
                  <motion.rect
                    key={`hist-${i}`}
                    x={x}
                    y={histogramHeight}
                    width={barWidth}
                    height={0}
                    fill={theme.colors.primary}
                    opacity={0.5}
                    rx={2}
                    animate={{ y, height: barHeight }}
                    transition={{ duration: 0.4, delay: i * 0.03 }}
                    onMouseEnter={(e: React.MouseEvent) => handleMouseEnter(e, bin, i)}
                    onMouseLeave={hideTooltip}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}

              {/* Histogram axis */}
              <AxisBottom
                scale={histXScale}
                top={histogramHeight}
                stroke={theme.axis.lineColor}
                tickStroke={theme.axis.tickColor}
                tickLabelProps={() => ({
                  fill: theme.axis.labelColor,
                  fontSize: 9,
                  textAnchor: 'middle',
                })}
                tickFormat={(v) => {
                  const idx = parseInt(v as string);
                  const bin = bins[idx];
                  return bin ? formatters.percent(bin.confidence, 0) : '';
                }}
              />
              <AxisRight
                scale={histYScale}
                left={boundedWidth}
                stroke={theme.axis.lineColor}
                tickStroke={theme.axis.tickColor}
                tickLabelProps={() => ({
                  fill: theme.axis.labelColor,
                  fontSize: 9,
                  textAnchor: 'start',
                  dx: 4,
                })}
                numTicks={3}
                label="Count"
                labelProps={{
                  fill: theme.axis.titleColor,
                  fontSize: 10,
                  textAnchor: 'middle',
                  angle: 90,
                }}
              />
            </Group>
          )}

          {/* ECE annotation */}
          <g>
            <rect
              x={boundedWidth - 120}
              y={10}
              width={110}
              height={50}
              rx={6}
              fill={theme.colors.surface}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
            <text
              x={boundedWidth - 65}
              y={28}
              textAnchor="middle"
              fontSize={11}
              fill={theme.colors.textMuted}
            >
              ECE
            </text>
            <text
              x={boundedWidth - 65}
              y={48}
              textAnchor="middle"
              fontSize={18}
              fontWeight="bold"
              fill={ece < 0.05 ? semanticColors.calibration.wellCalibrated : ece < 0.1 ? semanticColors.calibration.underconfident : semanticColors.calibration.overconfident}
            >
              {formatters.percent(ece, 1)}
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(10, 10)`}>
            <rect
              x={0}
              y={0}
              width={160}
              height={70}
              rx={6}
              fill={theme.colors.surface}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
            <g transform="translate(10, 15)">
              <circle cx={6} cy={0} r={5} fill={semanticColors.calibration.wellCalibrated} />
              <text x={18} y={4} fontSize={10} fill={theme.colors.text}>
                Well Calibrated
              </text>
            </g>
            <g transform="translate(10, 35)">
              <circle cx={6} cy={0} r={5} fill={semanticColors.calibration.overconfident} />
              <text x={18} y={4} fontSize={10} fill={theme.colors.text}>
                Overconfident
              </text>
            </g>
            <g transform="translate(10, 55)">
              <circle cx={6} cy={0} r={5} fill={semanticColors.calibration.underconfident} />
              <text x={18} y={4} fontSize={10} fill={theme.colors.text}>
                Underconfident
              </text>
            </g>
          </g>
        </Group>
      </svg>

      {/* Hidden description for screen readers */}
      <div id={descriptionId} className="sr-only">
        {descriptionText}
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
          }}
        >
          <div className="space-y-2">
            <div className="font-medium">
              Bin {tooltipData.index + 1}
            </div>
            <div className="space-y-1 text-sm" style={{ color: theme.tooltip.secondaryTextColor }}>
              <div className="flex justify-between gap-4">
                <span>Confidence:</span>
                <span className="font-medium" style={{ color: theme.tooltip.textColor }}>
                  {formatters.percent(tooltipData.bin.confidence, 1)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Accuracy:</span>
                <span className="font-medium" style={{ color: theme.tooltip.textColor }}>
                  {formatters.percent(tooltipData.bin.accuracy, 1)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Count:</span>
                <span className="font-medium" style={{ color: theme.tooltip.textColor }}>
                  {formatters.number(tooltipData.bin.count, 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Gap:</span>
                <span
                  className="font-medium"
                  style={{
                    color: getStatusColor(
                      getCalibrationStatus(tooltipData.bin.confidence, tooltipData.bin.accuracy)
                    ),
                  }}
                >
                  {formatters.percent(Math.abs(tooltipData.bin.confidence - tooltipData.bin.accuracy), 1)}
                </span>
              </div>
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}
