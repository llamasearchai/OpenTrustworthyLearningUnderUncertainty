/**
 * Web Vitals Monitoring
 *
 * Utilities for monitoring and reporting Core Web Vitals.
 *
 * @module lib/performance/web-vitals
 */

import React, { useEffect, useCallback, useRef, useState, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type MetricName = 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';

export interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

export interface MetricThresholds {
  good: number;
  needsImprovement: number;
}

export type MetricReportHandler = (metric: Metric) => void;

export interface WebVitalsConfig {
  onReport?: MetricReportHandler;
  reportAllChanges?: boolean;
  durationThreshold?: number;
}

// ============================================================================
// Thresholds (based on web.dev recommendations)
// ============================================================================

export const METRIC_THRESHOLDS: Record<MetricName, MetricThresholds> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  FID: { good: 100, needsImprovement: 300 },
  INP: { good: 200, needsImprovement: 500 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

// ============================================================================
// Utility Functions
// ============================================================================

function getRating(name: MetricName, value: number): Metric['rating'] {
  const thresholds = METRIC_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function generateUniqueId(): string {
  return `v3-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ============================================================================
// Individual Metric Collectors
// ============================================================================

let clsValue = 0;
let clsEntries: PerformanceEntry[] = [];

function observeCLS(callback: MetricReportHandler): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const id = generateUniqueId();
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  let sessionStartTime = 0;
  let previousValue = 0;

  const entryHandler = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      const layoutShift = entry as PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      };

      if (!layoutShift.hadRecentInput) {
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

        // New session if gap > 1s or total > 5s
        if (
          sessionValue &&
          entry.startTime - (lastSessionEntry?.startTime ?? 0) > 1000 &&
          entry.startTime - sessionStartTime > 5000
        ) {
          sessionValue = 0;
          sessionEntries = [];
        }

        if (!firstSessionEntry) {
          sessionStartTime = entry.startTime;
        }

        sessionValue += layoutShift.value;
        sessionEntries.push(entry);

        if (sessionValue > clsValue) {
          clsValue = sessionValue;
          clsEntries = sessionEntries;

          if (clsValue !== previousValue) {
            previousValue = clsValue;
            callback({
              name: 'CLS',
              value: clsValue,
              rating: getRating('CLS', clsValue),
              delta: clsValue - previousValue,
              id,
              entries: clsEntries,
            });
          }
        }
      }
    }
  };

  const observer = new PerformanceObserver((entryList) => {
    entryHandler(entryList.getEntries());
  });

  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Fallback for browsers that don't support the buffered flag
  }

  return () => observer.disconnect();
}

function observeFCP(callback: MetricReportHandler): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const id = generateUniqueId();

  const entryHandler = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      if (entry.name === 'first-contentful-paint') {
        const value = entry.startTime;
        callback({
          name: 'FCP',
          value,
          rating: getRating('FCP', value),
          delta: value,
          id,
          entries: [entry],
        });
      }
    }
  };

  const observer = new PerformanceObserver((entryList) => {
    entryHandler(entryList.getEntries());
  });

  try {
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // Fallback
  }

  return () => observer.disconnect();
}

function observeLCP(callback: MetricReportHandler): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const id = generateUniqueId();
  let previousValue = 0;

  const entryHandler = (entries: PerformanceEntry[]) => {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      const value = lastEntry.startTime;
      if (value !== previousValue) {
        previousValue = value;
        callback({
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          delta: value - previousValue,
          id,
          entries: [lastEntry],
        });
      }
    }
  };

  const observer = new PerformanceObserver((entryList) => {
    entryHandler(entryList.getEntries());
  });

  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Fallback
  }

  return () => observer.disconnect();
}

function observeFID(callback: MetricReportHandler): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const id = generateUniqueId();

  const entryHandler = (entries: PerformanceEntry[]) => {
    const firstEntry = entries[0] as PerformanceEntry & { processingStart: number };
    if (firstEntry) {
      const value = firstEntry.processingStart - firstEntry.startTime;
      callback({
        name: 'FID',
        value,
        rating: getRating('FID', value),
        delta: value,
        id,
        entries: [firstEntry],
      });
    }
  };

  const observer = new PerformanceObserver((entryList) => {
    entryHandler(entryList.getEntries());
  });

  try {
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // Fallback
  }

  return () => observer.disconnect();
}

function observeINP(callback: MetricReportHandler): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const id = generateUniqueId();
  let previousValue = 0;

  const entryHandler = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      const eventEntry = entry as PerformanceEntry & {
        processingStart: number;
        processingEnd: number;
        duration: number;
      };

      const value = eventEntry.duration;
      if (value > previousValue) {
        previousValue = value;
        callback({
          name: 'INP',
          value,
          rating: getRating('INP', value),
          delta: value - previousValue,
          id,
          entries: [entry],
        });
      }
    }
  };

  const observer = new PerformanceObserver((entryList) => {
    entryHandler(entryList.getEntries());
  });

  try {
    observer.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  } catch {
    // Fallback
  }

  return () => observer.disconnect();
}

function observeTTFB(callback: MetricReportHandler): void {
  if (typeof performance === 'undefined') return;

  const navigationEntry = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (navigationEntry) {
    const value = navigationEntry.responseStart - navigationEntry.requestStart;
    const id = generateUniqueId();

    callback({
      name: 'TTFB',
      value,
      rating: getRating('TTFB', value),
      delta: value,
      id,
      entries: [navigationEntry],
    });
  }
}

// ============================================================================
// Main Observer Function
// ============================================================================

/**
 * Start observing all Web Vitals metrics
 *
 * @example
 * ```tsx
 * const cleanup = observeWebVitals({
 *   onReport: (metric) => {
 *     console.log(metric.name, metric.value, metric.rating);
 *     // Send to analytics
 *     analytics.track('web_vital', metric);
 *   },
 * });
 *
 * // Cleanup on unmount
 * cleanup();
 * ```
 */
export function observeWebVitals(config: WebVitalsConfig = {}): () => void {
  const { onReport = console.log } = config;

  const cleanupFns: ((() => void) | undefined)[] = [];

  cleanupFns.push(observeCLS(onReport));
  cleanupFns.push(observeFCP(onReport));
  cleanupFns.push(observeLCP(onReport));
  cleanupFns.push(observeFID(onReport));
  cleanupFns.push(observeINP(onReport));
  observeTTFB(onReport);

  return () => {
    cleanupFns.forEach((cleanup) => cleanup?.());
  };
}

// ============================================================================
// useWebVitals Hook
// ============================================================================

export interface WebVitalsState {
  metrics: Partial<Record<MetricName, Metric>>;
  isSupported: boolean;
}

/**
 * Hook to observe and access Web Vitals metrics
 *
 * @example
 * ```tsx
 * function PerformanceDashboard() {
 *   const { metrics, isSupported } = useWebVitals({
 *     onReport: (metric) => {
 *       sendToAnalytics(metric);
 *     },
 *   });
 *
 *   if (!isSupported) return <div>Web Vitals not supported</div>;
 *
 *   return (
 *     <div>
 *       <MetricCard name="LCP" metric={metrics.LCP} />
 *       <MetricCard name="FID" metric={metrics.FID} />
 *       <MetricCard name="CLS" metric={metrics.CLS} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebVitals(config: WebVitalsConfig = {}): WebVitalsState {
  const [metrics, setMetrics] = useState<Partial<Record<MetricName, Metric>>>({});
  const [isSupported] = useState(
    () => typeof PerformanceObserver !== 'undefined'
  );

  const onReportRef = useRef(config.onReport);
  useEffect(() => {
    onReportRef.current = config.onReport;
  });

  useEffect(() => {
    if (!isSupported) return;

    const handleMetric = (metric: Metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name]: metric,
      }));
      onReportRef.current?.(metric);
    };

    return observeWebVitals({
      ...config,
      onReport: handleMetric,
    });
  }, [isSupported]);

  return { metrics, isSupported };
}

// ============================================================================
// PerformanceMonitor Component
// ============================================================================

export interface PerformanceMonitorProps {
  onReport?: MetricReportHandler;
  children?: ReactNode;
  showDebugOverlay?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Component that monitors and optionally displays Web Vitals
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <PerformanceMonitor
 *       onReport={(metric) => analytics.track('web_vital', metric)}
 *       showDebugOverlay={process.env.NODE_ENV === 'development'}
 *       position="bottom-right"
 *     >
 *       <YourApp />
 *     </PerformanceMonitor>
 *   );
 * }
 * ```
 */
export function PerformanceMonitor({
  onReport,
  children,
  showDebugOverlay = false,
  position = 'bottom-right',
}: PerformanceMonitorProps) {
  const { metrics, isSupported } = useWebVitals({ onReport });

  if (!showDebugOverlay || !isSupported) {
    return React.createElement(React.Fragment, null, children);
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  };

  const getRatingColor = (rating: Metric['rating']): string => {
    switch (rating) {
      case 'good':
        return '#0cce6b';
      case 'needs-improvement':
        return '#ffa400';
      case 'poor':
        return '#ff4e42';
      default:
        return '#888';
    }
  };

  const formatValue = (name: MetricName, value: number): string => {
    switch (name) {
      case 'CLS':
        return value.toFixed(3);
      case 'FCP':
      case 'LCP':
      case 'FID':
      case 'INP':
      case 'TTFB':
        return `${Math.round(value)}ms`;
      default:
        return String(value);
    }
  };

  const overlay = React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        minWidth: '150px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          fontWeight: 'bold',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        },
      },
      'Web Vitals'
    ),
    Object.entries(METRIC_THRESHOLDS).map(([name]) => {
      const metric = metrics[name as MetricName];
      return React.createElement(
        'div',
        {
          key: name,
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          },
        },
        React.createElement('span', { style: { opacity: 0.8 } }, name),
        React.createElement(
          'span',
          {
            style: {
              color: metric ? getRatingColor(metric.rating) : '#888',
              fontWeight: 'bold',
            },
          },
          metric ? formatValue(name as MetricName, metric.value) : '-'
        )
      );
    })
  );

  return React.createElement(
    React.Fragment,
    null,
    children,
    overlay
  );
}

// ============================================================================
// Performance Marks and Measures
// ============================================================================

/**
 * Create a performance mark
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): PerformanceMeasure | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      if (endMark) {
        return performance.measure(name, startMark, endMark);
      }
      return performance.measure(name, startMark);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Hook for measuring component render time
 */
export function useRenderTime(componentName: string): void {
  const markName = `${componentName}-render`;

  useEffect(() => {
    markPerformance(`${markName}-start`);

    return () => {
      markPerformance(`${markName}-end`);
      const measure = measurePerformance(
        markName,
        `${markName}-start`,
        `${markName}-end`
      );

      if (measure && process.env.NODE_ENV === 'development') {
        console.debug(`[RenderTime] ${componentName}: ${measure.duration.toFixed(2)}ms`);
      }
    };
  }, [componentName, markName]);
}

// ============================================================================
// Long Task Observer
// ============================================================================

export interface LongTask {
  duration: number;
  startTime: number;
  name: string;
}

export type LongTaskHandler = (task: LongTask) => void;

/**
 * Observe long tasks (tasks blocking the main thread for >50ms)
 */
export function observeLongTasks(
  callback: LongTaskHandler,
  threshold: number = 50
): (() => void) | undefined {
  if (typeof PerformanceObserver === 'undefined') return;

  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.duration > threshold) {
        callback({
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
        });
      }
    }
  });

  try {
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long task observer not supported
    return;
  }

  return () => observer.disconnect();
}
