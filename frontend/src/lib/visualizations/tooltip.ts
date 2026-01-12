/**
 * Visualization Tooltip System
 *
 * Provides tooltip hooks, portal components, and formatters for
 * D3.js/Visx chart visualizations with smart positioning.
 *
 * @module lib/visualizations/tooltip
 */

import * as React from 'react';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatters } from './core';

// ============================================================================
// Types
// ============================================================================

export interface TooltipPosition {
  left: number;
  top: number;
}

export interface TooltipData<T = unknown> {
  data: T;
  x: number;
  y: number;
}

export interface UseTooltipOptions {
  /** Offset from cursor/point in pixels */
  offset?: { x: number; y: number };
  /** Delay before showing tooltip in ms */
  showDelay?: number;
  /** Delay before hiding tooltip in ms */
  hideDelay?: number;
  /** Container bounds for smart positioning */
  containerBounds?: DOMRect | null;
}

export interface UseTooltipReturn<T = unknown> {
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Tooltip data */
  tooltipData: T | null;
  /** Tooltip left position */
  tooltipLeft: number;
  /** Tooltip top position */
  tooltipTop: number;
  /** Show tooltip with data and position */
  showTooltip: (x: number, y: number, data: T) => void;
  /** Hide tooltip */
  hideTooltip: () => void;
  /** Update tooltip position only */
  updatePosition: (x: number, y: number) => void;
  /** Container ref for tooltip */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Get tooltip props for positioning */
  getTooltipProps: () => {
    style: React.CSSProperties;
    'aria-hidden': boolean;
  };
}

// ============================================================================
// Smart Positioning Utilities
// ============================================================================

export interface SmartPositionOptions {
  /** Preferred position relative to point */
  preferredPosition?: 'top' | 'right' | 'bottom' | 'left';
  /** Offset from point */
  offset?: number;
  /** Container bounds */
  containerBounds?: DOMRect | null;
  /** Tooltip dimensions */
  tooltipDimensions?: { width: number; height: number };
  /** Viewport padding */
  viewportPadding?: number;
}

/**
 * Calculate smart tooltip position that stays within viewport
 */
export function calculateSmartPosition(
  pointX: number,
  pointY: number,
  options: SmartPositionOptions = {}
): TooltipPosition {
  const {
    preferredPosition = 'top',
    offset = 10,
    containerBounds,
    tooltipDimensions = { width: 200, height: 100 },
    viewportPadding = 10,
  } = options;

  // Get viewport dimensions
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Calculate container offset
  const containerLeft = containerBounds?.left ?? 0;
  const containerTop = containerBounds?.top ?? 0;

  // Calculate absolute position
  const absoluteX = pointX + containerLeft;
  const absoluteY = pointY + containerTop;

  let left = absoluteX;
  let top = absoluteY;

  // Try positions in order of preference
  const positions = getPositionOrder(preferredPosition);

  for (const position of positions) {
    const pos = calculatePositionForSide(
      absoluteX,
      absoluteY,
      position,
      offset,
      tooltipDimensions
    );

    // Check if position is within viewport
    if (isWithinViewport(pos, tooltipDimensions, viewportWidth, viewportHeight, viewportPadding)) {
      left = pos.left;
      top = pos.top;
      break;
    }
  }

  // Clamp to viewport as fallback
  left = Math.max(viewportPadding, Math.min(left, viewportWidth - tooltipDimensions.width - viewportPadding));
  top = Math.max(viewportPadding, Math.min(top, viewportHeight - tooltipDimensions.height - viewportPadding));

  return { left, top };
}

function getPositionOrder(preferred: 'top' | 'right' | 'bottom' | 'left'): Array<'top' | 'right' | 'bottom' | 'left'> {
  const all: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
  return [preferred, ...all.filter((p) => p !== preferred)];
}

function calculatePositionForSide(
  x: number,
  y: number,
  side: 'top' | 'right' | 'bottom' | 'left',
  offset: number,
  dimensions: { width: number; height: number }
): TooltipPosition {
  switch (side) {
    case 'top':
      return { left: x - dimensions.width / 2, top: y - dimensions.height - offset };
    case 'right':
      return { left: x + offset, top: y - dimensions.height / 2 };
    case 'bottom':
      return { left: x - dimensions.width / 2, top: y + offset };
    case 'left':
      return { left: x - dimensions.width - offset, top: y - dimensions.height / 2 };
  }
}

function isWithinViewport(
  position: TooltipPosition,
  dimensions: { width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  padding: number
): boolean {
  return (
    position.left >= padding &&
    position.top >= padding &&
    position.left + dimensions.width <= viewportWidth - padding &&
    position.top + dimensions.height <= viewportHeight - padding
  );
}

// ============================================================================
// useTooltip Hook
// ============================================================================

/**
 * Hook for managing tooltip state and positioning
 *
 * Provides complete tooltip state management with smart positioning,
 * show/hide delays, and viewport-aware positioning.
 *
 * @param options - Tooltip configuration options
 * @returns Tooltip state and control functions
 *
 * @example
 * ```tsx
 * const tooltip = useTooltip<DataPoint>({ offset: { x: 10, y: 10 } });
 *
 * <circle
 *   onMouseEnter={(e) => tooltip.showTooltip(e.clientX, e.clientY, dataPoint)}
 *   onMouseLeave={tooltip.hideTooltip}
 * />
 *
 * {tooltip.isVisible && (
 *   <TooltipPortal>
 *     <div {...tooltip.getTooltipProps()}>
 *       {tooltip.tooltipData.value}
 *     </div>
 *   </TooltipPortal>
 * )}
 * ```
 */
export function useTooltip<T = unknown>(
  options: UseTooltipOptions = {}
): UseTooltipReturn<T> {
  const { offset = { x: 10, y: 10 }, showDelay = 0, hideDelay = 0 } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<T | null>(null);
  const [position, setPosition] = useState<TooltipPosition>({ left: 0, top: 0 });

  const containerRef = useRef<HTMLElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const showTooltip = useCallback(
    (x: number, y: number, data: T) => {
      // Clear any pending hide
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      const show = () => {
        setTooltipData(data);
        setPosition({ left: x + offset.x, top: y + offset.y });
        setIsVisible(true);
      };

      if (showDelay > 0) {
        showTimeoutRef.current = setTimeout(show, showDelay);
      } else {
        show();
      }
    },
    [offset.x, offset.y, showDelay]
  );

  const hideTooltip = useCallback(() => {
    // Clear any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    const hide = () => {
      setIsVisible(false);
      setTooltipData(null);
    };

    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(hide, hideDelay);
    } else {
      hide();
    }
  }, [hideDelay]);

  const updatePosition = useCallback(
    (x: number, y: number) => {
      setPosition({ left: x + offset.x, top: y + offset.y });
    },
    [offset.x, offset.y]
  );

  const getTooltipProps = useCallback(
    () => ({
      style: {
        position: 'fixed' as const,
        left: position.left,
        top: position.top,
        zIndex: 9999,
        pointerEvents: 'none' as const,
      },
      'aria-hidden': !isVisible,
    }),
    [position.left, position.top, isVisible]
  );

  return {
    isVisible,
    tooltipData,
    tooltipLeft: position.left,
    tooltipTop: position.top,
    showTooltip,
    hideTooltip,
    updatePosition,
    containerRef,
    getTooltipProps,
  };
}

// ============================================================================
// TooltipPortal Component
// ============================================================================

export interface TooltipPortalProps {
  children: React.ReactNode;
  /** Container element to render tooltip in (defaults to document.body) */
  container?: Element | null;
}

/**
 * Portal component for rendering tooltips outside SVG
 *
 * Renders children in a portal to document.body or specified container,
 * allowing tooltips to escape SVG clipping and overflow constraints.
 *
 * @param props - Portal props
 * @returns Portal element
 *
 * @example
 * ```tsx
 * <TooltipPortal>
 *   <div className="tooltip">
 *     Tooltip content
 *   </div>
 * </TooltipPortal>
 * ```
 */
export function TooltipPortal({
  children,
  container,
}: TooltipPortalProps): React.ReactPortal | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const portalContainer = container ?? (typeof document !== 'undefined' ? document.body : null);

  if (!portalContainer) return null;

  return createPortal(children, portalContainer);
}

// ============================================================================
// Tooltip Content Components
// ============================================================================

export interface TooltipContainerProps {
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Background color */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Text color */
  textColor?: string;
}

/**
 * Styled tooltip container component
 */
export function TooltipContainer({
  children,
  className = '',
  style,
  backgroundColor = 'hsl(var(--popover))',
  borderColor = 'hsl(var(--border))',
  textColor = 'hsl(var(--popover-foreground))',
}: TooltipContainerProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    backgroundColor,
    border: `1px solid ${borderColor}`,
    color: textColor,
    padding: '8px 12px',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    fontSize: '13px',
    lineHeight: 1.4,
    maxWidth: '300px',
    ...style,
  };

  return React.createElement('div', {
    className: `chart-tooltip ${className}`.trim(),
    style: containerStyle,
  }, children);
}

export interface TooltipRowProps {
  label: string;
  value: string | number;
  color?: string;
  formatter?: (value: string | number) => string;
}

/**
 * Tooltip row with label and value
 */
export function TooltipRow({
  label,
  value,
  color,
  formatter,
}: TooltipRowProps): React.ReactElement {
  const formattedValue = formatter ? formatter(value) : String(value);

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      marginTop: '4px',
    },
  }, [
    React.createElement('div', {
      key: 'label',
      style: { display: 'flex', alignItems: 'center', gap: '6px' },
    }, [
      color && React.createElement('div', {
        key: 'color',
        style: {
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        },
      }),
      React.createElement('span', {
        key: 'text',
        style: { color: 'inherit', opacity: 0.7 },
      }, label),
    ]),
    React.createElement('span', {
      key: 'value',
      style: { fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
    }, formattedValue),
  ]);
}

// ============================================================================
// Value Formatters
// ============================================================================

/**
 * Format a number with appropriate precision
 */
export function formatNumber(value: number, decimals = 2): string {
  return formatters.number(value, decimals);
}

/**
 * Format a percentage value (0.5 -> "50%")
 */
export function formatPercent(value: number, decimals = 1): string {
  return formatters.percent(value, decimals);
}

/**
 * Format a currency value
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return formatters.currency(value, currency);
}

/**
 * Format a date value
 */
export function formatDate(
  value: Date | number,
  pattern: 'short' | 'long' | 'time' | 'datetime' | 'iso' = 'short'
): string {
  return formatters.date(value, pattern);
}

/**
 * Format a duration in milliseconds
 */
export function formatDuration(ms: number): string {
  return formatters.duration(ms);
}

/**
 * Format a number in compact notation (1.2K, 3.4M)
 */
export function formatCompact(value: number, decimals = 1): string {
  return formatters.compact(value, decimals);
}

// ============================================================================
// Tooltip Format Helpers
// ============================================================================

export interface TooltipValueConfig {
  value: number | string | Date;
  type: 'number' | 'percent' | 'currency' | 'date' | 'duration' | 'compact' | 'raw';
  options?: {
    decimals?: number;
    currency?: string;
    datePattern?: 'short' | 'long' | 'time' | 'datetime' | 'iso';
  };
}

/**
 * Format a value based on type configuration
 */
export function formatTooltipValue(config: TooltipValueConfig): string {
  const { value, type, options = {} } = config;

  switch (type) {
    case 'number':
      return formatNumber(value as number, options.decimals);
    case 'percent':
      return formatPercent(value as number, options.decimals);
    case 'currency':
      return formatCurrency(value as number, options.currency);
    case 'date':
      return formatDate(value as Date | number, options.datePattern);
    case 'duration':
      return formatDuration(value as number);
    case 'compact':
      return formatCompact(value as number, options.decimals);
    case 'raw':
    default:
      return String(value);
  }
}

// ============================================================================
// Crosshair Hook
// ============================================================================

export interface UseCrosshairOptions {
  /** Enable horizontal line */
  horizontal?: boolean;
  /** Enable vertical line */
  vertical?: boolean;
  /** Line color */
  color?: string;
  /** Line stroke width */
  strokeWidth?: number;
  /** Line dash pattern */
  strokeDasharray?: string;
}

export interface UseCrosshairReturn {
  /** Current crosshair position */
  position: { x: number; y: number } | null;
  /** Update crosshair position */
  updatePosition: (x: number, y: number) => void;
  /** Clear crosshair */
  clearPosition: () => void;
  /** Get crosshair line props */
  getCrosshairProps: () => {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
    pointerEvents: 'none';
  };
}

/**
 * Hook for managing chart crosshair lines
 */
export function useCrosshair(options: UseCrosshairOptions = {}): UseCrosshairReturn {
  const {
    color = '#94a3b8',
    strokeWidth = 1,
    strokeDasharray = '4,4',
  } = options;

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const updatePosition = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const clearPosition = useCallback(() => {
    setPosition(null);
  }, []);

  const getCrosshairProps = useCallback(
    () => ({
      stroke: color,
      strokeWidth,
      strokeDasharray,
      pointerEvents: 'none' as const,
    }),
    [color, strokeWidth, strokeDasharray]
  );

  return {
    position,
    updatePosition,
    clearPosition,
    getCrosshairProps,
  };
}
