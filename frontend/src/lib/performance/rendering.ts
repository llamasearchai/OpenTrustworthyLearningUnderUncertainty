/**
 * Rendering Performance Utilities
 *
 * Hooks and utilities for optimizing React rendering performance.
 *
 * @module lib/performance/rendering
 */

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  DependencyList,
} from 'react';

// ============================================================================
// useRenderCount Hook
// ============================================================================

export interface UseRenderCountOptions {
  componentName?: string;
  logToConsole?: boolean;
  warnThreshold?: number;
}

/**
 * Hook to track and log component render counts
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderCount = useRenderCount({ componentName: 'MyComponent' });
 *
 *   return <div>Rendered {renderCount} times</div>;
 * }
 * ```
 */
export function useRenderCount(options: UseRenderCountOptions = {}): number {
  const {
    componentName = 'Component',
    logToConsole = process.env.NODE_ENV === 'development',
    warnThreshold = 10,
  } = options;

  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    if (logToConsole) {
      const count = renderCount.current;
      const message = `[RenderCount] ${componentName}: ${count}`;

      if (count >= warnThreshold) {
        console.warn(message, '- Consider optimizing this component');
      } else if (process.env.NODE_ENV === 'development') {
        console.debug(message);
      }
    }
  });

  return renderCount.current;
}

// ============================================================================
// useMemoCompare Hook
// ============================================================================

/**
 * Custom comparison function for useMemoCompare
 */
export type CompareFunction<T> = (prev: T | undefined, next: T) => boolean;

/**
 * Hook that memoizes a value using a custom comparison function
 *
 * @example
 * ```tsx
 * function MyComponent({ user }) {
 *   // Only re-render when user.id changes, not on every reference change
 *   const memoizedUser = useMemoCompare(
 *     user,
 *     (prev, next) => prev?.id === next?.id
 *   );
 *
 *   return <UserCard user={memoizedUser} />;
 * }
 * ```
 */
export function useMemoCompare<T>(
  value: T,
  compare: CompareFunction<T>
): T {
  const previousRef = useRef<T | undefined>(undefined);
  const isFirstRender = useRef(true);

  // On first render, always use the new value
  if (isFirstRender.current) {
    isFirstRender.current = false;
    previousRef.current = value;
    return value;
  }

  // Compare with previous value
  const isEqual = compare(previousRef.current, value);

  // If equal, return previous reference to avoid re-renders
  if (isEqual && previousRef.current !== undefined) {
    return previousRef.current;
  }

  // Update reference and return new value
  previousRef.current = value;
  return value;
}

/**
 * Shallow compare two objects
 */
export function shallowEqual<T extends object>(prev: T | undefined, next: T): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;

  const prevKeys = Object.keys(prev) as Array<keyof T>;
  const nextKeys = Object.keys(next) as Array<keyof T>;

  if (prevKeys.length !== nextKeys.length) return false;

  return prevKeys.every((key) => prev[key] === next[key]);
}

/**
 * Deep compare two values (for objects and arrays)
 */
export function deepEqual(prev: unknown, next: unknown): boolean {
  if (prev === next) return true;
  if (typeof prev !== typeof next) return false;
  if (prev === null || next === null) return prev === next;

  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;
    return prev.every((item, index) => deepEqual(item, next[index]));
  }

  if (typeof prev === 'object' && typeof next === 'object') {
    const prevObj = prev as Record<string, unknown>;
    const nextObj = next as Record<string, unknown>;
    const prevKeys = Object.keys(prevObj);
    const nextKeys = Object.keys(nextObj);

    if (prevKeys.length !== nextKeys.length) return false;
    return prevKeys.every((key) => deepEqual(prevObj[key], nextObj[key]));
  }

  return prev === next;
}

// ============================================================================
// useStableCallback Hook
// ============================================================================

/**
 * Hook that returns a stable callback reference that always calls the latest function
 *
 * @example
 * ```tsx
 * function MyComponent({ onSubmit }) {
 *   // stableOnSubmit always has the same reference but calls latest onSubmit
 *   const stableOnSubmit = useStableCallback(onSubmit);
 *
 *   return <Form onSubmit={stableOnSubmit} />;
 * }
 * ```
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update the ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Return a stable function that calls the latest callback
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

// ============================================================================
// useDeferredValue Hook (enhanced)
// ============================================================================

/**
 * Custom deferred value hook with configurable delay
 *
 * @example
 * ```tsx
 * function SearchResults({ query }) {
 *   const deferredQuery = useDeferredValueWithDelay(query, 300);
 *
 *   return <ExpensiveList filter={deferredQuery} />;
 * }
 * ```
 */
export function useDeferredValueWithDelay<T>(value: T, delay: number): T {
  const previousRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      previousRef.current = value;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return previousRef.current;
}

// ============================================================================
// useDebounce Hook
// ============================================================================

/**
 * Hook that debounces a value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [value, setValue] = useState('');
 *   const debouncedValue = useDebounce(value, 300);
 *
 *   useEffect(() => {
 *     // Only fires after user stops typing for 300ms
 *     search(debouncedValue);
 *   }, [debouncedValue]);
 *
 *   return <input value={value} onChange={(e) => setValue(e.target.value)} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const debouncedRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      debouncedRef.current = value;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedRef.current;
}

/**
 * Hook that creates a debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

// ============================================================================
// useThrottle Hook
// ============================================================================

/**
 * Hook that throttles a value
 *
 * @example
 * ```tsx
 * function MouseTracker() {
 *   const [position, setPosition] = useState({ x: 0, y: 0 });
 *   const throttledPosition = useThrottle(position, 100);
 *
 *   return <div>Position: {throttledPosition.x}, {throttledPosition.y}</div>;
 * }
 * ```
 */
export function useThrottle<T>(value: T, limit: number): T {
  const lastValueRef = useRef(value);
  const lastTimeRef = useRef(Date.now());

  const now = Date.now();
  if (now - lastTimeRef.current >= limit) {
    lastValueRef.current = value;
    lastTimeRef.current = now;
  }

  return lastValueRef.current;
}

/**
 * Hook that creates a throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastTimeRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastTimeRef.current >= limit) {
        lastTimeRef.current = now;
        callbackRef.current(...args);
      }
    },
    [limit]
  );
}

// ============================================================================
// usePreviousValue Hook
// ============================================================================

/**
 * Hook that returns the previous value
 *
 * @example
 * ```tsx
 * function Counter({ count }) {
 *   const previousCount = usePreviousValue(count);
 *
 *   return (
 *     <div>
 *       Current: {count}, Previous: {previousCount}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreviousValue<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ============================================================================
// useWhyDidYouUpdate Hook
// ============================================================================

/**
 * Debug hook that logs which props changed between renders
 *
 * @example
 * ```tsx
 * function MyComponent(props) {
 *   useWhyDidYouUpdate('MyComponent', props);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWhyDidYouUpdate(
  componentName: string,
  props: Record<string, unknown>
): void {
  const previousProps = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const allKeys = new Set([
      ...Object.keys(previousProps.current),
      ...Object.keys(props),
    ]);

    const changedProps: Record<string, { from: unknown; to: unknown }> = {};

    allKeys.forEach((key) => {
      if (previousProps.current[key] !== props[key]) {
        changedProps[key] = {
          from: previousProps.current[key],
          to: props[key],
        };
      }
    });

    if (Object.keys(changedProps).length > 0) {
      console.debug(`[WhyDidYouUpdate] ${componentName}:`, changedProps);
    }

    previousProps.current = props;
  });
}

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Create a memoized selector with custom equality
 */
export function createMemoizedSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = Object.is
): (state: TState) => TResult {
  let lastState: TState | undefined;
  let lastResult: TResult | undefined;

  return (state: TState): TResult => {
    if (lastState === undefined) {
      lastState = state;
      lastResult = selector(state);
      return lastResult;
    }

    const nextResult = selector(state);

    if (lastResult !== undefined && equalityFn(lastResult, nextResult)) {
      return lastResult;
    }

    lastState = state;
    lastResult = nextResult;
    return nextResult;
  };
}

/**
 * Memoize a function with LRU cache
 */
export function memoizeWithCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    maxSize?: number;
    keyResolver?: (...args: TArgs) => string;
  } = {}
): (...args: TArgs) => TResult {
  const { maxSize = 100, keyResolver } = options;
  const cache = new Map<string, TResult>();
  const keys: string[] = [];

  return (...args: TArgs): TResult => {
    const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    if (keys.length >= maxSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    cache.set(key, result);
    keys.push(key);

    return result;
  };
}

// ============================================================================
// useComputed Hook
// ============================================================================

/**
 * Hook for computed values with dependency tracking
 *
 * @example
 * ```tsx
 * function ExpensiveComponent({ items }) {
 *   const expensiveValue = useComputed(
 *     () => items.reduce((sum, item) => sum + item.value, 0),
 *     [items]
 *   );
 *
 *   return <div>Total: {expensiveValue}</div>;
 * }
 * ```
 */
export function useComputed<T>(
  compute: () => T,
  deps: DependencyList
): T {
  return useMemo(compute, deps);
}
