/**
 * UncertaintyChart Component
 *
 * Visualizes uncertainty decomposition (aleatoric/epistemic) with multiple
 * variant types: bar, gauge, pie/donut, decomposition breakdown.
 * Includes confidence indicators, threshold lines, and colored zones.
 *
 * @module components/visualizations/uncertainty-chart
 */

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Arc } from '@visx/shape';
import { Pie } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChartDimensions, colorSchemes, formatters } from '@/lib/visualizations/core';
import { useChartTheme, semanticColors } from '@/lib/visualizations/theme';
import { useChartA11y } from '@/lib/visualizations/a11y';
import type { UncertaintyEstimate } from '@/types/api';

// ============================================================================
// Types
// ============================================================================

interface UncertaintyData {
  label: string;
  value: number;
  color: string;
  description?: string;
}

export type ChartType = 'bar' | 'gauge' | 'donut' | 'pie' | 'decomposition';

interface UncertaintyChartProps {
  data: UncertaintyEstimate;
  type?: ChartType;
}

interface UncertaintyZone {
  min: number;
  max: number;
  color: string;
  label: string;
}

// ============================================================================
// Threshold Zones
// ============================================================================

function getUncertaintyZones(
  warningThreshold: number,
  criticalThreshold: number
): UncertaintyZone[] {
  return [
    {
      min: 0,
      max: warningThreshold * 0.5,
      color: semanticColors.uncertainty.low,
      label: 'Low',
    },
    {
      min: warningThreshold * 0.5,
      max: warningThreshold,
      color: semanticColors.uncertainty.medium,
      label: 'Medium',
    },
    {
      min: warningThreshold,
      max: criticalThreshold,
      color: semanticColors.uncertainty.high,
      label: 'High',
    },
    {
      min: criticalThreshold,
      max: 1,
      color: semanticColors.uncertainty.critical,
      label: 'Critical',
    },
  ];
}

// ============================================================================
// Gauge Variant
// ============================================================================

function GaugeChart({
  data,
  width,
  height,
  warningThreshold,
  criticalThreshold,
  animated = true,
}: {
  data: UncertaintyEstimate;
  width: number;
  height: number;
  warningThreshold: number;
  criticalThreshold: number;
  animated?: boolean;
}) {
  const theme = useChartTheme();
  const centerX = width / 2;
  const centerY = height * 0.65;
  const radius = Math.min(width, height) * 0.4;
  const totalUncertainty = data.aleatoric_score + data.epistemic_score;

  // Normalize to 0-1 range
  const normalizedValue = Math.min(totalUncertainty, 1);

  // Arc angles (180 degree gauge)
  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  const angleRange = endAngle - startAngle;
  const valueAngle = startAngle + normalizedValue * angleRange;

  // Get zones
  const zones = getUncertaintyZones(warningThreshold, criticalThreshold);

  // Determine color based on value
  const currentZone = zones.find((z) => normalizedValue >= z.min && normalizedValue < z.max) || zones[zones.length - 1];
  const needleColor = currentZone.color;

  return (
    <Group top={centerY} left={centerX}>
      {/* Background arc */}
      <Arc
        innerRadius={radius * 0.65}
        outerRadius={radius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={theme.colors.surface}
      />

      {/* Zone arcs */}
      {zones.map((zone, i) => {
        const zoneStart = startAngle + zone.min * angleRange;
        const zoneEnd = startAngle + zone.max * angleRange;
        return (
          <Arc
            key={zone.label}
            innerRadius={radius * 0.65}
            outerRadius={radius}
            startAngle={zoneStart}
            endAngle={zoneEnd}
            fill={zone.color}
            opacity={0.3}
          />
        );
      })}

      {/* Value arc */}
      {animated ? (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Arc
            innerRadius={radius * 0.65}
            outerRadius={radius}
            startAngle={startAngle}
            endAngle={valueAngle}
            fill={needleColor}
          />
        </motion.g>
      ) : (
        <Arc
          innerRadius={radius * 0.65}
          outerRadius={radius}
          startAngle={startAngle}
          endAngle={valueAngle}
          fill={needleColor}
        />
      )}

      {/* Needle */}
      <motion.line
        x1={0}
        y1={0}
        x2={0}
        y2={-radius * 0.55}
        stroke={needleColor}
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ rotate: -135 }}
        animate={{ rotate: -135 + normalizedValue * 270 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: 'center center' }}
      />

      {/* Center circle */}
      <circle r={radius * 0.12} fill={needleColor} />

      {/* Center text */}
      <text
        textAnchor="middle"
        dy={radius * 0.45}
        fontSize={radius * 0.25}
        fontWeight="bold"
        fill={theme.colors.text}
      >
        {formatters.percent(normalizedValue, 0)}
      </text>
      <text
        textAnchor="middle"
        dy={radius * 0.65}
        fontSize={radius * 0.1}
        fill={theme.colors.textMuted}
      >
        Total Uncertainty
      </text>

      {/* Min/Max labels */}
      <text
        x={-radius * 0.9}
        y={radius * 0.15}
        fontSize={10}
        fill={theme.colors.textMuted}
      >
        0%
      </text>
      <text
        x={radius * 0.75}
        y={radius * 0.15}
        fontSize={10}
        fill={theme.colors.textMuted}
      >
        100%
      </text>

      {/* Confidence badge */}
      <g transform={`translate(0, ${radius * 0.85})`}>
        <rect
          x={-40}
          y={-12}
          width={80}
          height={24}
          rx={12}
          fill={theme.colors.surface}
          stroke={theme.colors.border}
        />
        <text
          textAnchor="middle"
          dy="0.35em"
          fontSize={11}
          fill={theme.colors.text}
        >
          Conf: {formatters.percent(data.confidence, 0)}
        </text>
      </g>
    </Group>
  );
}

// ============================================================================
// Bar Variant
// ============================================================================

function BarChart({
  data,
  width,
  height,
  warningThreshold,
  criticalThreshold,
  animated = true,
}: {
  data: UncertaintyEstimate;
  width: number;
  height: number;
  warningThreshold: number;
  criticalThreshold: number;
  animated?: boolean;
}) {
  const theme = useChartTheme();
  const margin = { top: 30, right: 30, bottom: 50, left: 80 };
  const boundedWidth = width - margin.left - margin.right;
  const boundedHeight = height - margin.top - margin.bottom;

  const chartData: UncertaintyData[] = [
    {
      label: 'Aleatoric',
      value: data.aleatoric_score,
      color: '#3b82f6', // blue
      description: 'Data uncertainty (irreducible)',
    },
    {
      label: 'Epistemic',
      value: data.epistemic_score,
      color: '#8b5cf6', // purple
      description: 'Model uncertainty (reducible)',
    },
  ];

  const totalUncertainty = data.aleatoric_score + data.epistemic_score;
  const maxValue = Math.max(totalUncertainty * 1.2, 1);

  const xScale = scaleBand({
    domain: chartData.map((d) => d.label),
    range: [0, boundedWidth],
    padding: 0.4,
  });

  const yScale = scaleLinear({
    domain: [0, maxValue],
    range: [boundedHeight, 0],
    nice: true,
  });

  return (
    <Group left={margin.left} top={margin.top}>
      {/* Threshold zones background */}
      <rect
        x={0}
        y={yScale(warningThreshold)}
        width={boundedWidth}
        height={yScale(0) - yScale(warningThreshold)}
        fill={semanticColors.uncertainty.low}
        opacity={0.1}
      />
      <rect
        x={0}
        y={yScale(criticalThreshold)}
        width={boundedWidth}
        height={yScale(warningThreshold) - yScale(criticalThreshold)}
        fill={semanticColors.uncertainty.high}
        opacity={0.1}
      />
      <rect
        x={0}
        y={0}
        width={boundedWidth}
        height={yScale(criticalThreshold)}
        fill={semanticColors.uncertainty.critical}
        opacity={0.1}
      />

      {/* Threshold lines */}
      <line
        x1={0}
        x2={boundedWidth}
        y1={yScale(warningThreshold)}
        y2={yScale(warningThreshold)}
        stroke={semanticColors.uncertainty.high}
        strokeDasharray="6,4"
        strokeWidth={1.5}
      />
      <text
        x={boundedWidth + 5}
        y={yScale(warningThreshold)}
        dy="0.35em"
        fontSize={10}
        fill={semanticColors.uncertainty.high}
      >
        Warning
      </text>

      <line
        x1={0}
        x2={boundedWidth}
        y1={yScale(criticalThreshold)}
        y2={yScale(criticalThreshold)}
        stroke={semanticColors.uncertainty.critical}
        strokeDasharray="6,4"
        strokeWidth={1.5}
      />
      <text
        x={boundedWidth + 5}
        y={yScale(criticalThreshold)}
        dy="0.35em"
        fontSize={10}
        fill={semanticColors.uncertainty.critical}
      >
        Critical
      </text>

      {/* Bars */}
      {chartData.map((d, i) => {
        const barWidth = xScale.bandwidth();
        const barHeight = boundedHeight - (yScale(d.value) ?? 0);
        const x = xScale(d.label) ?? 0;
        const y = yScale(d.value) ?? 0;

        if (animated) {
          return (
            <motion.rect
              key={d.label}
              x={x}
              y={boundedHeight}
              width={barWidth}
              height={0}
              fill={d.color}
              rx={6}
              animate={{ y, height: barHeight }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          );
        }

        return (
          <Bar
            key={d.label}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={d.color}
            rx={6}
          />
        );
      })}

      {/* Bar value labels */}
      {chartData.map((d) => (
        <text
          key={`label-${d.label}`}
          x={(xScale(d.label) ?? 0) + xScale.bandwidth() / 2}
          y={yScale(d.value) - 8}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill={theme.colors.text}
        >
          {formatters.number(d.value, 3)}
        </text>
      ))}

      {/* Axes */}
      <AxisLeft
        scale={yScale}
        stroke={theme.axis.lineColor}
        tickStroke={theme.axis.tickColor}
        tickLabelProps={() => ({
          fill: theme.axis.labelColor,
          fontSize: 11,
          textAnchor: 'end',
          dx: -4,
        })}
      />
      <AxisBottom
        scale={xScale}
        top={boundedHeight}
        stroke={theme.axis.lineColor}
        tickStroke={theme.axis.tickColor}
        tickLabelProps={() => ({
          fill: theme.axis.labelColor,
          fontSize: 11,
          textAnchor: 'middle',
        })}
      />
    </Group>
  );
}

// ============================================================================
// Pie/Donut Variant
// ============================================================================

function PieChart({
  data,
  width,
  height,
  variant = 'donut',
  animated = true,
}: {
  data: UncertaintyEstimate;
  width: number;
  height: number;
  variant?: 'pie' | 'donut';
  animated?: boolean;
}) {
  const theme = useChartTheme();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const innerRadius = variant === 'donut' ? radius * 0.6 : 0;

  const chartData: UncertaintyData[] = [
    {
      label: 'Aleatoric',
      value: data.aleatoric_score,
      color: '#3b82f6',
    },
    {
      label: 'Epistemic',
      value: data.epistemic_score,
      color: '#8b5cf6',
    },
  ];

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  return (
    <Group top={centerY} left={centerX}>
      <Pie
        data={chartData}
        pieValue={(d) => d.value}
        outerRadius={radius}
        innerRadius={innerRadius}
        padAngle={0.02}
        cornerRadius={4}
      >
        {(pie) =>
          pie.arcs.map((arc, index) => {
            const d = chartData[index];
            const [centroidX, centroidY] = pie.path.centroid(arc);

            if (animated) {
              return (
                <motion.g key={d?.label}>
                  <motion.path
                    d={pie.path(arc) ?? ''}
                    fill={d?.color}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                  <motion.text
                    x={centroidX}
                    y={centroidY}
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={11}
                    fontWeight="bold"
                    fill="white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  >
                    {formatters.percent(d?.value ? d.value / total : 0, 0)}
                  </motion.text>
                </motion.g>
              );
            }

            return (
              <g key={d?.label}>
                <path d={pie.path(arc) ?? ''} fill={d?.color} />
                <text
                  x={centroidX}
                  y={centroidY}
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={11}
                  fontWeight="bold"
                  fill="white"
                >
                  {formatters.percent(d?.value ? d.value / total : 0, 0)}
                </text>
              </g>
            );
          })
        }
      </Pie>

      {/* Center text for donut */}
      {variant === 'donut' && (
        <>
          <text
            textAnchor="middle"
            dy="-0.2em"
            fontSize={radius * 0.25}
            fontWeight="bold"
            fill={theme.colors.text}
          >
            {formatters.number(total, 2)}
          </text>
          <text
            textAnchor="middle"
            dy="1.2em"
            fontSize={radius * 0.12}
            fill={theme.colors.textMuted}
          >
            Total
          </text>
        </>
      )}
    </Group>
  );
}

// ============================================================================
// Decomposition Variant
// ============================================================================

function DecompositionChart({
  data,
  width,
  height,
  warningThreshold,
  criticalThreshold,
  animated = true,
}: {
  data: UncertaintyEstimate;
  width: number;
  height: number;
  warningThreshold: number;
  criticalThreshold: number;
  animated?: boolean;
}) {
  const theme = useChartTheme();
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const boundedWidth = width - margin.left - margin.right;
  const boundedHeight = height - margin.top - margin.bottom;

  const totalUncertainty = data.aleatoric_score + data.epistemic_score;
  const aleatoricRatio = data.aleatoric_score / Math.max(totalUncertainty, 0.001);
  const epistemicRatio = data.epistemic_score / Math.max(totalUncertainty, 0.001);

  // Stacked bar data
  const barHeight = 40;
  const barY = boundedHeight / 2 - barHeight / 2;

  // Determine status color
  const getStatusColor = () => {
    if (totalUncertainty >= criticalThreshold) return semanticColors.uncertainty.critical;
    if (totalUncertainty >= warningThreshold) return semanticColors.uncertainty.high;
    if (totalUncertainty >= warningThreshold * 0.5) return semanticColors.uncertainty.medium;
    return semanticColors.uncertainty.low;
  };

  return (
    <Group left={margin.left} top={margin.top}>
      {/* Title */}
      <text
        x={boundedWidth / 2}
        y={0}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
        fill={theme.colors.text}
      >
        Uncertainty Decomposition
      </text>

      {/* Stacked horizontal bar */}
      <g transform={`translate(0, ${barY})`}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={boundedWidth}
          height={barHeight}
          fill={theme.colors.surface}
          rx={barHeight / 2}
        />

        {/* Aleatoric portion */}
        {animated ? (
          <motion.rect
            x={0}
            y={0}
            width={0}
            height={barHeight}
            fill="#3b82f6"
            rx={barHeight / 2}
            animate={{ width: boundedWidth * aleatoricRatio }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ) : (
          <rect
            x={0}
            y={0}
            width={boundedWidth * aleatoricRatio}
            height={barHeight}
            fill="#3b82f6"
            rx={barHeight / 2}
          />
        )}

        {/* Epistemic portion (overlay) */}
        {animated ? (
          <motion.rect
            x={boundedWidth * aleatoricRatio}
            y={0}
            width={0}
            height={barHeight}
            fill="#8b5cf6"
            animate={{ width: boundedWidth * epistemicRatio }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          />
        ) : (
          <rect
            x={boundedWidth * aleatoricRatio}
            y={0}
            width={boundedWidth * epistemicRatio}
            height={barHeight}
            fill="#8b5cf6"
          />
        )}

        {/* Percentage labels on bar */}
        {aleatoricRatio > 0.15 && (
          <text
            x={boundedWidth * aleatoricRatio / 2}
            y={barHeight / 2}
            dy="0.35em"
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill="white"
          >
            {formatters.percent(aleatoricRatio, 0)}
          </text>
        )}
        {epistemicRatio > 0.15 && (
          <text
            x={boundedWidth * aleatoricRatio + boundedWidth * epistemicRatio / 2}
            y={barHeight / 2}
            dy="0.35em"
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill="white"
          >
            {formatters.percent(epistemicRatio, 0)}
          </text>
        )}
      </g>

      {/* Stats below */}
      <g transform={`translate(0, ${barY + barHeight + 30})`}>
        <g>
          <circle cx={10} cy={0} r={6} fill="#3b82f6" />
          <text x={22} y={0} dy="0.35em" fontSize={12} fill={theme.colors.text}>
            Aleatoric: {formatters.number(data.aleatoric_score, 3)}
          </text>
        </g>
        <g transform={`translate(${boundedWidth / 2}, 0)`}>
          <circle cx={10} cy={0} r={6} fill="#8b5cf6" />
          <text x={22} y={0} dy="0.35em" fontSize={12} fill={theme.colors.text}>
            Epistemic: {formatters.number(data.epistemic_score, 3)}
          </text>
        </g>
      </g>

      {/* Total and confidence indicator */}
      <g transform={`translate(${boundedWidth / 2}, ${boundedHeight - 20})`}>
        <rect
          x={-120}
          y={-20}
          width={240}
          height={40}
          rx={8}
          fill={theme.colors.surface}
          stroke={getStatusColor()}
          strokeWidth={2}
        />
        <text
          x={-60}
          y={0}
          dy="0.35em"
          textAnchor="middle"
          fontSize={12}
          fill={theme.colors.text}
        >
          Total: <tspan fontWeight="bold" fill={getStatusColor()}>{formatters.number(totalUncertainty, 3)}</tspan>
        </text>
        <text
          x={60}
          y={0}
          dy="0.35em"
          textAnchor="middle"
          fontSize={12}
          fill={theme.colors.text}
        >
          Conf: <tspan fontWeight="bold">{formatters.percent(data.confidence, 0)}</tspan>
        </text>
      </g>
    </Group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UncertaintyChart({
  data,
  height,
  type = 'bar',
  showConfidence = true,
  warningThreshold = 0.3,
  criticalThreshold = 0.6,
  animated = true,
  title,
  description,
  className,
  'data-testid': testId,
}: UncertaintyChartProps & {
  height: number;
  showConfidence?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
  animated?: boolean;
  title?: string;
  description?: string;
  className?: string;
  'data-testid'?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useChartDimensions(containerRef, { top: 20, right: 20, bottom: 40, left: 20 });
  const { width } = dimensions;
  const theme = useChartTheme();

  const { chartProps, descriptionId, descriptionText } = useChartA11y({
    chartId: testId || 'uncertainty-chart',
    title: title || 'Uncertainty decomposition chart',
    description: description || `Aleatoric: ${data.aleatoric_score.toFixed(3)}, Epistemic: ${data.epistemic_score.toFixed(3)}, Confidence: ${(data.confidence * 100).toFixed(0)}%`,
    chartType: type === 'bar' ? 'bar' : type === 'gauge' ? 'other' : 'pie',
  });

  if (width <= 0) {
    return (
      <div
        ref={containerRef}
        className={cn('w-full', className)}
        style={{ height }}
        data-testid={testId}
      />
    );
  }

  const renderChart = () => {
    const chartProps = {
      data,
      width,
      height: height - 80,
      warningThreshold,
      criticalThreshold,
      animated,
    };

    switch (type) {
      case 'gauge':
        return <GaugeChart {...chartProps} />;
      case 'donut':
        return <PieChart {...chartProps} variant="donut" />;
      case 'pie':
        return <PieChart {...chartProps} variant="pie" />;
      case 'decomposition':
        return <DecompositionChart {...chartProps} />;
      case 'bar':
      default:
        return <BarChart {...chartProps} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height }}
      data-testid={testId}
    >
      <svg
        width="100%"
        height={height}
        role="img"
        aria-label={title ?? 'Uncertainty decomposition chart'}
        aria-describedby={descriptionId}
      >
        {renderChart()}
      </svg>

      {/* Hidden description */}
      <div id={descriptionId} className="sr-only">
        {descriptionText}
      </div>

      {/* Source label */}
      <div className="absolute bottom-2 right-2 text-xs" style={{ color: theme.colors.textMuted }}>
        Source: {data.source}
      </div>

      {/* Legend (for bar and decomposition only shown separately) */}
      {(type === 'bar' || type === 'pie' || type === 'donut') && (
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>
              Aleatoric: {formatters.number(data.aleatoric_score, 3)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>
              Epistemic: {formatters.number(data.epistemic_score, 3)}
            </span>
          </div>
        </div>
      )}

      {/* Confidence indicator (when not gauge or decomposition) */}
      {showConfidence && type !== 'gauge' && type !== 'decomposition' && (
        <div className="flex justify-center mt-2">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
              Confidence:
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color:
                  data.confidence >= 0.8
                    ? semanticColors.uncertainty.low
                    : data.confidence >= 0.5
                      ? semanticColors.uncertainty.medium
                      : semanticColors.uncertainty.critical,
              }}
            >
              {formatters.percent(data.confidence, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
