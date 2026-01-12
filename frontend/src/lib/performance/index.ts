/**
 * Performance Module
 *
 * Exports all performance optimization utilities.
 *
 * @module lib/performance
 */

// Rendering
export {
  useRenderCount,
  useMemoCompare,
  shallowEqual,
  deepEqual,
  useStableCallback,
  useDeferredValueWithDelay,
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
  usePreviousValue,
  useWhyDidYouUpdate,
  createMemoizedSelector,
  memoizeWithCache,
  useComputed,
  type UseRenderCountOptions,
  type CompareFunction,
} from './rendering';

// Virtualization
export {
  useVirtualList,
  useVirtualGrid,
  useInfiniteScroll,
  useWindowVirtualList,
  type VirtualItem,
  type VirtualListOptions,
  type VirtualListResult,
  type VirtualGridOptions,
  type VirtualGridItem,
  type VirtualGridResult,
  type InfiniteScrollOptions,
  type InfiniteScrollResult,
  type UseWindowVirtualListOptions,
} from './virtualization';

// Lazy Loading
export {
  lazyWithPreload,
  preloadOnHover,
  preloadOnVisible,
  preloadOnIdle,
  createRoutePreloader,
  SuspenseWithDelay,
  preloadImport,
  createPreloadableImport,
  type LazyComponentImport,
  type PreloadableComponent,
  type LazyWithPreloadOptions,
  type PreloadOnHoverOptions,
  type PreloadOnVisibleOptions,
  type RoutePreloadConfig,
  type SuspenseWithDelayProps,
} from './lazy';

// Web Vitals
export {
  observeWebVitals,
  useWebVitals,
  PerformanceMonitor,
  markPerformance,
  measurePerformance,
  useRenderTime,
  observeLongTasks,
  METRIC_THRESHOLDS,
  type MetricName,
  type Metric,
  type MetricThresholds,
  type MetricReportHandler,
  type WebVitalsConfig,
  type WebVitalsState,
  type PerformanceMonitorProps,
  type LongTask,
  type LongTaskHandler,
} from './web-vitals';
