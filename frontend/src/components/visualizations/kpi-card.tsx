/**
 * KPICard Component
 *
 * Key Performance Indicator card with enhanced features:
 * - Trend indicator with customizable direction
 * - Sparkline visualization using Visx
 * - Multiple format options
 * - Dark mode support
 * - Accessible design
 *
 * @module components/visualizations/kpi-card
 */

import * as React from 'react';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatters } from '@/lib/visualizations/core';
import { useChartTheme, semanticColors } from '@/lib/visualizations/theme';
import { Card, CardContent } from '@/components/common/card';
import type { KPICardProps } from '@/types/components';

// ============================================================================
// Types
// ============================================================================

type TrendDirection = 'up' | 'down' | 'neutral';
type KPISize = 'sm' | 'default' | 'lg';
type KPIVariant = 'default' | 'outlined' | 'filled';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
  areaOpacity?: number;
  animated?: boolean;
}

interface EnhancedKPICardProps extends KPICardProps {
  /** Card size variant */
  size?: KPISize;
  /** Card style variant */
  variant?: KPIVariant;
  /** Show sparkline area fill */
  showSparklineArea?: boolean;
  /** Status indicator (overrides trend color) */
  status?: 'success' | 'warning' | 'error' | 'info';
  /** Target value for comparison */
  target?: number;
  /** Show change as absolute value instead of percentage */
  showAbsoluteChange?: boolean;
  /** Subtitle text */
  subtitle?: string;
  /** Enable animation */
  animated?: boolean;
  /** Additional metric */
  secondaryMetric?: {
    label: string;
    value: number | string;
    format?: 'percent' | 'number' | 'currency' | 'duration';
  };
}

// ============================================================================
// Sparkline Component
// ============================================================================

function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
  strokeWidth = 2,
  showArea = false,
  areaOpacity = 0.2,
  animated = true,
}: SparklineProps) {
  const theme = useChartTheme();

  if (!data || data.length === 0) return null;

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, data.length - 1],
        range: [0, width],
      }),
    [data.length, width]
  );

  const yMin = Math.min(...data);
  const yMax = Math.max(...data);
  const padding = (yMax - yMin) * 0.1 || 1;

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [yMin - padding, yMax + padding],
        range: [height - 2, 2],
      }),
    [yMin, yMax, padding, height]
  );

  const lineData = data.map((d, i) => ({ x: i, y: d }));

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {showArea && (
        <>
          <LinearGradient
            id={gradientId}
            from={color}
            to={color}
            fromOpacity={areaOpacity}
            toOpacity={0.02}
            vertical
          />
          <AreaClosed
            data={lineData}
            x={(d) => xScale(d.x) ?? 0}
            y={(d) => yScale(d.y) ?? 0}
            yScale={yScale}
            fill={`url(#${gradientId})`}
            curve={curveMonotoneX}
          />
        </>
      )}
      {animated ? (
        <motion.g
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <LinePath
            data={lineData}
            x={(d) => xScale(d.x) ?? 0}
            y={(d) => yScale(d.y) ?? 0}
            stroke={color}
            strokeWidth={strokeWidth}
            curve={curveMonotoneX}
          />
        </motion.g>
      ) : (
        <LinePath
          data={lineData}
          x={(d) => xScale(d.x) ?? 0}
          y={(d) => yScale(d.y) ?? 0}
          stroke={color}
          strokeWidth={strokeWidth}
          curve={curveMonotoneX}
        />
      )}
      {/* End point indicator */}
      <circle
        cx={xScale(data.length - 1)}
        cy={yScale(data[data.length - 1])}
        r={3}
        fill={color}
        stroke={theme.colors.background}
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ============================================================================
// Format Value Helper
// ============================================================================

function formatValue(
  value: number | string,
  format?: 'percent' | 'number' | 'currency' | 'duration',
  decimals = 2
): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'percent':
      return formatters.percent(value);
    case 'currency':
      return formatters.currency(value);
    case 'duration':
      return formatters.duration(value);
    case 'number':
    default:
      // Auto-format based on value magnitude
      if (Math.abs(value) >= 1000000) {
        return formatters.compact(value, 1);
      }
      return formatters.number(value, value % 1 === 0 ? 0 : decimals);
  }
}

// ============================================================================
// Calculate Trend
// ============================================================================

function calculateTrend(
  current: number | string,
  previous?: number
): { direction: TrendDirection; percentChange: number; absoluteChange: number } {
  if (typeof current === 'string' || previous === undefined) {
    return { direction: 'neutral', percentChange: 0, absoluteChange: 0 };
  }

  const absoluteChange = current - previous;

  if (previous === 0) {
    return {
      direction: current > 0 ? 'up' : current < 0 ? 'down' : 'neutral',
      percentChange: current !== 0 ? 100 : 0,
      absoluteChange,
    };
  }

  const percentChange = ((current - previous) / Math.abs(previous)) * 100;

  if (Math.abs(percentChange) < 0.1) {
    return { direction: 'neutral', percentChange: 0, absoluteChange };
  }

  return {
    direction: percentChange > 0 ? 'up' : 'down',
    percentChange: Math.abs(percentChange),
    absoluteChange,
  };
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeConfig = {
  sm: {
    valueFontSize: 'text-xl',
    labelFontSize: 'text-xs',
    iconSize: 'h-3 w-3',
    sparklineWidth: 60,
    sparklineHeight: 20,
    padding: 'p-4',
  },
  default: {
    valueFontSize: 'text-2xl',
    labelFontSize: 'text-sm',
    iconSize: 'h-4 w-4',
    sparklineWidth: 80,
    sparklineHeight: 24,
    padding: 'p-6',
  },
  lg: {
    valueFontSize: 'text-4xl',
    labelFontSize: 'text-base',
    iconSize: 'h-5 w-5',
    sparklineWidth: 120,
    sparklineHeight: 32,
    padding: 'p-8',
  },
};

// ============================================================================
// KPICard Component
// ============================================================================

export function KPICard({
  title,
  value,
  previousValue,
  format,
  trend: explicitTrend,
  trendUpIsGood = true,
  icon,
  sparkline,
  description,
  onClick,
  size = 'default',
  variant = 'default',
  showSparklineArea = false,
  status,
  target,
  showAbsoluteChange = false,
  subtitle,
  animated = true,
  secondaryMetric,
  className,
  'data-testid': testId,
}: EnhancedKPICardProps) {
  const theme = useChartTheme();
  const config = sizeConfig[size];

  const { direction, percentChange, absoluteChange } = calculateTrend(value, previousValue);
  const actualTrend = explicitTrend ?? direction;

  // Determine trend color
  const trendColor = useMemo(() => {
    if (status) {
      switch (status) {
        case 'success':
          return semanticColors.uncertainty.low;
        case 'warning':
          return semanticColors.uncertainty.medium;
        case 'error':
          return semanticColors.uncertainty.critical;
        case 'info':
          return theme.colors.primary;
      }
    }

    if (actualTrend === 'neutral') return theme.colors.textMuted;
    const isPositive = actualTrend === 'up';
    const isGood = trendUpIsGood ? isPositive : !isPositive;
    return isGood ? semanticColors.uncertainty.low : semanticColors.uncertainty.critical;
  }, [status, actualTrend, trendUpIsGood, theme]);

  const TrendIcon = useMemo(() => {
    if (actualTrend === 'neutral') return Minus;
    return actualTrend === 'up' ? TrendingUp : TrendingDown;
  }, [actualTrend]);

  const sparklineColor = trendColor;

  // Target comparison
  const targetComparison = useMemo(() => {
    if (target === undefined || typeof value !== 'number') return null;
    const diff = value - target;
    const percentDiff = (diff / target) * 100;
    return {
      diff,
      percentDiff,
      isAbove: diff >= 0,
    };
  }, [target, value]);

  // Card styling
  const cardStyles = useMemo(() => {
    const base = 'transition-all duration-200';

    switch (variant) {
      case 'outlined':
        return cn(base, 'border-2', {
          'border-green-500': status === 'success',
          'border-yellow-500': status === 'warning',
          'border-red-500': status === 'error',
          'border-blue-500': status === 'info',
        });
      case 'filled':
        return cn(base, 'text-white', {
          'bg-green-500': status === 'success',
          'bg-yellow-500': status === 'warning',
          'bg-red-500': status === 'error',
          'bg-blue-500': status === 'info',
        });
      default:
        return cn(base, 'hover:shadow-md');
    }
  }, [variant, status]);

  return (
    <Card
      interactive={!!onClick}
      className={cn(cardStyles, className)}
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className={config.padding}>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            {/* Header */}
            <div className="flex items-center gap-2">
              {icon && (
                <span
                  className={variant === 'filled' ? 'text-white/80' : 'text-muted-foreground'}
                  aria-hidden="true"
                >
                  {icon}
                </span>
              )}
              <h3
                className={cn(
                  'font-medium',
                  config.labelFontSize,
                  variant === 'filled' ? 'text-white/90' : 'text-muted-foreground'
                )}
              >
                {title}
              </h3>
              {status === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p
                className={cn(
                  'text-xs',
                  variant === 'filled' ? 'text-white/70' : 'text-muted-foreground'
                )}
              >
                {subtitle}
              </p>
            )}

            {/* Value */}
            <div className="flex items-baseline gap-2">
              {animated ? (
                <motion.span
                  className={cn(
                    config.valueFontSize,
                    'font-bold tracking-tight',
                    variant === 'filled' ? 'text-white' : ''
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {formatValue(value, format)}
                </motion.span>
              ) : (
                <span
                  className={cn(
                    config.valueFontSize,
                    'font-bold tracking-tight',
                    variant === 'filled' ? 'text-white' : ''
                  )}
                >
                  {formatValue(value, format)}
                </span>
              )}

              {/* Trend indicator */}
              {actualTrend !== 'neutral' && previousValue !== undefined && (
                <motion.div
                  className={cn('flex items-center gap-1', config.labelFontSize)}
                  style={{ color: trendColor }}
                  initial={animated ? { opacity: 0, x: -10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <TrendIcon className={config.iconSize} aria-hidden="true" />
                  <span>
                    {showAbsoluteChange
                      ? formatValue(Math.abs(absoluteChange), format)
                      : `${formatters.number(percentChange, 1)}%`}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Target comparison */}
            {targetComparison && (
              <div
                className={cn(
                  'text-xs flex items-center gap-1',
                  variant === 'filled' ? 'text-white/70' : 'text-muted-foreground'
                )}
              >
                <span>Target: {formatValue(target!, format)}</span>
                <span
                  style={{
                    color: targetComparison.isAbove
                      ? semanticColors.uncertainty.low
                      : semanticColors.uncertainty.critical,
                  }}
                >
                  ({targetComparison.isAbove ? '+' : ''}{formatters.number(targetComparison.percentDiff, 1)}%)
                </span>
              </div>
            )}

            {/* Description */}
            {description && (
              <p
                className={cn(
                  'text-xs',
                  variant === 'filled' ? 'text-white/70' : 'text-muted-foreground'
                )}
              >
                {description}
              </p>
            )}

            {/* Secondary metric */}
            {secondaryMetric && (
              <div
                className={cn(
                  'pt-2 mt-2 border-t',
                  variant === 'filled' ? 'border-white/20' : ''
                )}
                style={{ borderColor: variant !== 'filled' ? theme.colors.border : undefined }}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      'text-xs',
                      variant === 'filled' ? 'text-white/70' : 'text-muted-foreground'
                    )}
                  >
                    {secondaryMetric.label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      variant === 'filled' ? 'text-white' : ''
                    )}
                  >
                    {formatValue(secondaryMetric.value, secondaryMetric.format)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sparkline */}
          {sparkline && sparkline.length > 1 && (
            <div className="ml-4 flex-shrink-0">
              <Sparkline
                data={sparkline}
                color={sparklineColor}
                width={config.sparklineWidth}
                height={config.sparklineHeight}
                showArea={showSparklineArea}
                animated={animated}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KPI Grid Component
// ============================================================================

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function KPIGrid({ children, columns = 4, className }: KPIGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
